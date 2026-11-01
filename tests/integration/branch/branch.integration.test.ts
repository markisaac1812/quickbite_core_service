import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertBranch, insertMember, insertUser, outboxEvents, seedMember, seedRestaurant} from "../../helpers/factories";
import {ADMIN, authCookie, INTERNAL_HEADERS} from "../../helpers/auth";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();

const createBody = {
    countryCode: "EG",
    label: "Zamalek",
    addressText: "26 July St, Zamalek",
    lat: 30.0626,
    lng: 31.2197,
    opensAt: "10:00",
    closesAt: "22:00",
    deliveryRadius: 4,
    currency: "EGP",
};

describe("branches", () => {
    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
    });

    describe("POST /api/restaurants/:restaurantId/branches", () => {
        it("lets the owner open an inactive branch with no commission", async () => {
            // Arrange
            const {restaurantId, ownerJwt} = await seedRestaurant();

            // Act
            const res = await request(app).post(`/api/restaurants/${restaurantId}/branches`).set("Cookie", authCookie(ownerJwt)).send(createBody);

            // Assert
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Branch created successfully");
            expect(res.body.data).toMatchObject({
                label: "Zamalek",
                countryCode: "EG",
                isActive: false,
                acceptOrders: true,
                commission: 0,
                deliveryFee: 0,
                deliveryRadius: 4,
                opensAt: "10:00:00",
                currency: "EGP",
            });
            expect(Number(res.body.data.restaurantId)).toBe(restaurantId);
            expect(await db("restaurant_branches").where({restaurant_id: restaurantId})).toHaveLength(1);
        });

        it("denies a branch manager, who lacks core:branch:create", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const manager = await seedMember(restaurantId, "branch_manager");

            // Act
            const res = await request(app).post(`/api/restaurants/${restaurantId}/branches`).set("Cookie", authCookie(manager.jwt)).send(createBody);

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "Permission denied"});
        });

        it("denies an owner-role member who is not the owner of record", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const coOwner = await insertUser({system_role: "restaurant_user"});
            await insertMember(restaurantId, coOwner.id, "owner");
            const jwt = {userId: coOwner.id, email: coOwner.email, role: "restaurant_user", restaurantId, restaurantRole: "owner", branchIds: []};

            // Act
            const res = await request(app).post(`/api/restaurants/${restaurantId}/branches`).set("Cookie", authCookie(jwt)).send(createBody);

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You are not authorised to perform this action"});
        });

        it("answers 404 for an unknown restaurant and 400 for an invalid body", async () => {
            // Arrange
            const {restaurantId, ownerJwt} = await seedRestaurant();

            // Act
            const unknown = await request(app).post("/api/restaurants/4242/branches").set("Cookie", authCookie(ADMIN)).send(createBody);
            const invalid = await request(app).post(`/api/restaurants/${restaurantId}/branches`).set("Cookie", authCookie(ownerJwt)).send({...createBody, currency: "USD"});

            // Assert
            expect([unknown.status, invalid.status]).toEqual([404, 400]);
        });
    });

    describe("GET /api/restaurants/:restaurantId/branches", () => {
        it("lists the restaurant's branches publicly", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            await insertBranch(restaurantId, {label: "Downtown"});
            await insertBranch(restaurantId, {label: "Maadi"});
            const other = await seedRestaurant();
            await insertBranch(other.restaurantId, {label: "Elsewhere"});

            // Act
            const res = await request(app).get(`/api/restaurants/${restaurantId}/branches`);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.map((b: {label: string}) => b.label).sort()).toEqual(["Downtown", "Maadi"]);
        });

        it("answers 404 for an unknown restaurant", async () => {
            // Arrange
            const unknownId = 4242;

            // Act
            const res = await request(app).get(`/api/restaurants/${unknownId}/branches`);

            // Assert
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/branches/nearby", () => {
        it("returns active branches of active restaurants whose delivery radius covers the point", async () => {
            // Arrange — the customer stands in Tahrir Square
            const open = await seedRestaurant({name: "Open Kitchen", logo_url: "open.png"});
            const near = await insertBranch(open.restaurantId, {label: "Downtown", lat: 30.05, lng: 31.24, delivery_radius: 5});
            await insertBranch(open.restaurantId, {label: "Closed", lat: 30.05, lng: 31.24, is_active: false});
            await insertBranch(open.restaurantId, {label: "Alexandria", lat: 31.2, lng: 29.92, delivery_radius: 5});
            const pending = await seedRestaurant({status: "pending"});
            await insertBranch(pending.restaurantId, {label: "Not live yet"});

            // Act
            const res = await request(app).get("/api/branches/nearby").query({lat: 30.0444, lng: 31.2357});

            // Assert
            expect(res.status).toBe(200);
            expect(res.headers["x-cache"]).toBe("MISS");
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({label: "Downtown", restaurantName: "Open Kitchen", logoUrl: "open.png", isActive: true, currency: "EGP"});
            expect(Number(res.body.data[0].id)).toBe(near);
        });

        it("serves a repeated search from the cache", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            await insertBranch(restaurantId);
            await request(app).get("/api/branches/nearby").query({lat: 30.0444, lng: 31.2357});
            await db("restaurant_branches").update({is_active: false});

            // Act
            const res = await request(app).get("/api/branches/nearby").query({lat: 30.0444, lng: 31.2357});

            // Assert
            expect(res.headers["x-cache"]).toBe("HIT");
            expect(res.body.data).toHaveLength(1);
        });
    });

    describe("PATCH /api/branches/:branchId", () => {
        it("lets the owner update a branch, emits branch.updated and evicts the internal cache entry", async () => {
            // Arrange
            const {restaurantId, ownerJwt} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId);
            cacheStub.store.set(`GET:/api/internal/branches/${branchId}`, {value: "{}"});

            // Act
            const res = await request(app).patch(`/api/branches/${branchId}`).set("Cookie", authCookie(ownerJwt)).send({label: "Downtown 2", deliveryFee: 1500, acceptOrders: false});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({label: "Downtown 2", deliveryFee: 1500, acceptOrders: false, addressText: "1 Talaat Harb St, Cairo"});
            expect(await outboxEvents()).toEqual([
                {event_type: "branch.updated", aggregate_type: "restaurant_branches", aggregate_id: String(branchId), payload: {branchId}},
            ]);
            expect(cacheStub.store.has(`GET:/api/internal/branches/${branchId}`)).toBe(false);
        });

        it("denies staff who are not assigned to the branch", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId);
            const otherBranch = await insertBranch(restaurantId);
            const staff = await seedMember(restaurantId, "staff", [otherBranch]);

            // Act
            const res = await request(app).patch(`/api/branches/${branchId}`).set("Cookie", authCookie(staff.jwt)).send({label: "X"});

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You do not have access to this branch"});
        });

        it("answers 404 for an unknown branch", async () => {
            // Arrange
            const {ownerJwt} = await seedRestaurant();

            // Act
            const res = await request(app).patch("/api/branches/99999").set("Cookie", authCookie(ownerJwt)).send({label: "X"});

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "Branch not found"});
            expect(await outboxEvents()).toEqual([]);
        });

        it("lets only the owner of record change branch settings, even for an assigned manager", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId);
            const manager = await seedMember(restaurantId, "branch_manager", [branchId]);

            // Act
            const res = await request(app).patch(`/api/branches/${branchId}`).set("Cookie", authCookie(manager.jwt)).send({label: "X"});

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You are not authorised to perform this action"});
            expect(await outboxEvents()).toEqual([]);
        });
    });

    describe("PATCH /api/branches/:id/status", () => {
        it("activates a branch and sets its commission (branch.updated)", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId, {is_active: false, commission: 0});

            // Act
            const res = await request(app).patch(`/api/branches/${branchId}/status`).set("Cookie", authCookie(ADMIN)).send({isActive: true, commission: 15});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({isActive: true, commission: 15});
            expect((await outboxEvents()).map((e) => e.event_type)).toEqual(["branch.updated"]);
        });

        it("deactivating a branch emits branch.deactivated", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId);

            // Act
            const res = await request(app).patch(`/api/branches/${branchId}/status`).set("Cookie", authCookie(ADMIN)).send({isActive: false});

            // Assert
            expect(res.status).toBe(200);
            expect(await outboxEvents()).toEqual([
                {event_type: "branch.deactivated", aggregate_type: "restaurant_branches", aggregate_id: String(branchId), payload: {branchId}},
            ]);
        });

        it("is admin-only and validates the commission", async () => {
            // Arrange
            const {restaurantId, ownerJwt} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId);

            // Act
            const byOwner = await request(app).patch(`/api/branches/${branchId}/status`).set("Cookie", authCookie(ownerJwt)).send({isActive: true});
            const invalid = await request(app).patch(`/api/branches/${branchId}/status`).set("Cookie", authCookie(ADMIN)).send({commission: 101});

            // Assert
            expect([byOwner.status, invalid.status]).toEqual([403, 400]);
        });

        it("answers 404 for an unknown branch", async () => {
            // Arrange
            const unknownId = 99999;

            // Act
            const res = await request(app).patch(`/api/branches/${unknownId}/status`).set("Cookie", authCookie(ADMIN)).send({isActive: false});

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "Branch not found"});
        });
    });

    describe("GET /api/internal/branches/:id", () => {
        it("returns the order-service view of a branch, with commission in basis points", async () => {
            // Arrange
            const {restaurantId, owner} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId, {commission: 12, delivery_fee: 2500});

            // Act
            const res = await request(app).get(`/api/internal/branches/${branchId}`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({
                restaurantOwnerId: owner.id,
                restaurantStatus: "active",
                region: "EG",
                isActive: true,
                acceptOrders: true,
                deliveryFee: 2500,
                commissionBps: 1200,
                currency: "EGP",
                lat: 30.05,
                lng: 31.24,
                name: "Downtown",
                addressText: "1 Talaat Harb St, Cairo",
            });
            expect([Number(res.body.data.id), Number(res.body.data.restaurantId)]).toEqual([branchId, restaurantId]);
        });

        it("answers 404 so callers can tell a missing branch from an outage", async () => {
            // Arrange
            const unknownId = 99999;

            // Act
            const res = await request(app).get(`/api/internal/branches/${unknownId}`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "Branch not found"});
        });

        it("requires the internal api key", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const branchId = await insertBranch(restaurantId);

            // Act
            const res = await request(app).get(`/api/internal/branches/${branchId}`).set("api-key", "wrong");

            // Assert
            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/internal/branches?ids=", () => {
        it("returns the branches that exist and silently drops unknown ids", async () => {
            // Arrange
            const a = await seedRestaurant();
            const b = await seedRestaurant({status: "suspended"});
            const branchA = await insertBranch(a.restaurantId);
            const branchB = await insertBranch(b.restaurantId);

            // Act
            const res = await request(app).get(`/api/internal/branches?ids=${branchA}, ${branchB},99999`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(200);
            const byId = new Map(res.body.data.map((d: {id: string; restaurantStatus: string}) => [Number(d.id), d.restaurantStatus]));
            expect(byId).toEqual(new Map([[branchA, "active"], [branchB, "suspended"]]));
        });

        it("answers an empty list for a missing or unusable ids query", async () => {
            // Arrange
            const query = ["", "?ids=", "?ids=abc,-1"];

            // Act
            const responses = await Promise.all(query.map((q) => request(app).get(`/api/internal/branches${q}`).set(INTERNAL_HEADERS)));

            // Assert
            expect(responses.map((r) => [r.status, r.body.data])).toEqual([[200, []], [200, []], [200, []]]);
        });

        it("caps a batch at 100 ids", async () => {
            // Arrange
            const ids = Array.from({length: 101}, (_, i) => i + 1).join(",");

            // Act
            const res = await request(app).get(`/api/internal/branches?ids=${ids}`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "ids: max 100 per call"});
        });
    });
});
