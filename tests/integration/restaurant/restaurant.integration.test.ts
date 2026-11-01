import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {DEFAULT_PASSWORD, insertMember, insertRestaurant, insertUser, outboxEvents, seedMember, seedRestaurant} from "../../helpers/factories";
import {ADMIN, authCookie} from "../../helpers/auth";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();

const createBody = {
    name: "Falafel House",
    primaryCountry: "EG",
    logoURL: "https://cdn.test/falafel.png",
    owner: {email: "falafel-owner@test.com", phone: "01055556666", name: "Fady", password: DEFAULT_PASSWORD},
};

describe("restaurants", () => {
    beforeAll(() => {
        jest.spyOn(console, "log").mockImplementation(() => {}); // repos/services log rows
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
    });

    describe("GET /api/restaurants", () => {
        it("pages by name with a usable cursor", async () => {
            // Arrange
            const owner = await insertUser({system_role: "restaurant_user"});
            for (const name of ["Cairo Grill", "Alexandria Fish", "Bab El Sheikh"]) await insertRestaurant(owner.id, {name});

            // Act
            const first = await request(app).get("/api/restaurants").query({limit: 2, sortBy: "name", sortOrder: "asc"});
            const second = await request(app).get("/api/restaurants").query({limit: 2, sortBy: "name", sortOrder: "asc", cursor: first.body.data.meta.nextCursor});

            // Assert
            expect(first.status).toBe(200);
            expect(first.body.data.data.map((r: {name: string}) => r.name)).toEqual(["Alexandria Fish", "Bab El Sheikh"]);
            expect(first.body.data.meta).toEqual({nextCursor: "Bab El Sheikh", hasMore: true, count: 2});
            expect(second.body.data.data.map((r: {name: string}) => r.name)).toEqual(["Cairo Grill"]);
            expect(second.body.data.meta).toEqual({nextCursor: null, hasMore: false, count: 1});
        });

        it("pages 20 at a time when no limit is given", async () => {
            // Arrange
            const owner = await insertUser({system_role: "restaurant_user"});
            for (let i = 0; i < 21; i++) await insertRestaurant(owner.id, {name: `Restaurant ${String(i).padStart(2, "0")}`});

            // Act
            const res = await request(app).get("/api/restaurants").query({sortBy: "name"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.data).toHaveLength(20);
            expect(res.body.data.meta).toEqual({nextCursor: "Restaurant 19", hasMore: true, count: 20});
        });

        it("filters on an allow-listed field", async () => {
            // Arrange
            const owner = await insertUser({system_role: "restaurant_user"});
            await insertRestaurant(owner.id, {name: "Open", status: "active"});
            await insertRestaurant(owner.id, {name: "Waiting", status: "pending"});

            // Act
            const res = await request(app).get("/api/restaurants?limit=10&filter[status][eq]=pending");

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.data).toHaveLength(1);
            expect(res.body.data.data[0]).toMatchObject({name: "Waiting", status: "pending"});
        });
    });

    describe("GET /api/restaurants/:id", () => {
        it("returns the restaurant", async () => {
            // Arrange
            const {restaurantId, owner} = await seedRestaurant({name: "Koshary Corner"});

            // Act
            const res = await request(app).get(`/api/restaurants/${restaurantId}`);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({name: "Koshary Corner", status: "active", primaryCountry: "EG", logoURL: "https://cdn.test/logo.png"});
            expect(Number(res.body.data.ownerId)).toBe(owner.id);
        });

        it("answers 404 for an unknown restaurant", async () => {
            // Arrange
            const unknownId = 4242;

            // Act
            const res = await request(app).get(`/api/restaurants/${unknownId}`);

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "Restaurant not found"});
        });
    });

    describe("POST /api/restaurants", () => {
        it("lets an admin onboard an active restaurant together with its owner", async () => {
            // Arrange
            const body = createBody;

            // Act
            const res = await request(app).post("/api/restaurants").set("Cookie", authCookie(ADMIN)).send(body);

            // Assert
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Restaurant and owner created successfully");
            expect(res.body.data.restaurant).toMatchObject({name: "Falafel House", status: "active", logoURL: "https://cdn.test/falafel.png"});
            expect(res.body.data.owner).toMatchObject({email: "falafel-owner@test.com", name: "Fady", systemRole: "restaurant_user"});
            const member = await db("restaurant_members as rm").join("roles as r", "rm.role_id", "r.id").where("rm.user_id", res.body.data.owner.id).first("r.name", "rm.status");
            expect(member).toEqual({name: "owner", status: "active"});
            const login = await request(app).post("/api/auth/login").send({email: "falafel-owner@test.com", password: DEFAULT_PASSWORD});
            expect(login.status).toBe(200);
        });

        it("forbids non-admins", async () => {
            // Arrange
            const customer = await insertUser();

            // Act
            const res = await request(app).post("/api/restaurants").set("Cookie", authCookie({userId: customer.id, email: customer.email, role: "customer"})).send(createBody);

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You are not authorised to perform this action"});
        });

        it("rolls everything back when the owner email is taken", async () => {
            // Arrange
            await insertUser({email: "falafel-owner@test.com"});

            // Act
            const res = await request(app).post("/api/restaurants").set("Cookie", authCookie(ADMIN)).send(createBody);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "User already exists"});
            expect(await db("restaurants")).toHaveLength(0);
        });
    });

    describe("PATCH /api/restaurants/:id", () => {
        it("lets the owner update the profile", async () => {
            // Arrange
            const {restaurantId, ownerJwt} = await seedRestaurant();

            // Act
            const res = await request(app).patch(`/api/restaurants/${restaurantId}`).set("Cookie", authCookie(ownerJwt)).send({name: "Koshary Palace", logoURL: "new.png"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({name: "Koshary Palace", logoURL: "new.png", primaryCountry: "EG"});
        });

        it("lets an admin update any restaurant", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();

            // Act
            const res = await request(app).patch(`/api/restaurants/${restaurantId}`).set("Cookie", authCookie(ADMIN)).send({primaryCountry: "SA"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.primaryCountry).toBe("SA");
        });

        it("denies staff, who lack core:restaurant:update", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const staff = await seedMember(restaurantId, "staff");

            // Act
            const res = await request(app).patch(`/api/restaurants/${restaurantId}`).set("Cookie", authCookie(staff.jwt)).send({name: "Hijacked"});

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "Permission denied"});
        });

        it("denies the owner of another restaurant", async () => {
            // Arrange
            const target = await seedRestaurant();
            const other = await seedRestaurant();

            // Act
            const res = await request(app).patch(`/api/restaurants/${target.restaurantId}`).set("Cookie", authCookie(other.ownerJwt)).send({name: "Hijacked"});

            // Assert
            expect(res.status).toBe(403);
        });

        it("denies an owner-role member who is not the restaurant's owner of record", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const coOwner = await insertUser({system_role: "restaurant_user"});
            await insertMember(restaurantId, coOwner.id, "owner");
            const jwt = {userId: coOwner.id, email: coOwner.email, role: "restaurant_user", restaurantId, restaurantRole: "owner", branchIds: []};

            // Act
            const res = await request(app).patch(`/api/restaurants/${restaurantId}`).set("Cookie", authCookie(jwt)).send({name: "Hijacked"});

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You are not authorised to perform this action"});
        });

        it("answers 404 for an unknown restaurant", async () => {
            // Arrange
            const unknownId = 4242;

            // Act
            const res = await request(app).patch(`/api/restaurants/${unknownId}`).set("Cookie", authCookie(ADMIN)).send({name: "X"});

            // Assert
            expect(res.status).toBe(404);
        });
    });

    describe("PATCH /api/restaurants/:id/status", () => {
        it("suspends a restaurant and emits restaurant.suspended in the same transaction", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();

            // Act
            const res = await request(app).patch(`/api/restaurants/${restaurantId}/status`).set("Cookie", authCookie(ADMIN)).send({status: "suspended"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe("suspended");
            expect(await outboxEvents()).toEqual([
                {event_type: "restaurant.suspended", aggregate_type: "restaurants", aggregate_id: String(restaurantId), payload: {restaurantId}},
            ]);
        });

        it("emits nothing for other status changes", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant({status: "pending"});

            // Act
            const res = await request(app).patch(`/api/restaurants/${restaurantId}/status`).set("Cookie", authCookie(ADMIN)).send({status: "active"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe("active");
            expect(await outboxEvents()).toEqual([]);
        });

        it("is admin-only, validates the status, and 404s an unknown restaurant", async () => {
            // Arrange
            const {restaurantId, ownerJwt} = await seedRestaurant();

            // Act
            const byOwner = await request(app).patch(`/api/restaurants/${restaurantId}/status`).set("Cookie", authCookie(ownerJwt)).send({status: "active"});
            const invalid = await request(app).patch(`/api/restaurants/${restaurantId}/status`).set("Cookie", authCookie(ADMIN)).send({status: "closed"});
            const unknown = await request(app).patch("/api/restaurants/4242/status").set("Cookie", authCookie(ADMIN)).send({status: "active"});

            // Assert
            expect([byOwner.status, invalid.status, unknown.status]).toEqual([403, 400, 404]);
        });
    });
});
