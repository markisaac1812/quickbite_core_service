import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertAddress, insertUser} from "../../helpers/factories";
import {authCookie, INTERNAL_HEADERS} from "../../helpers/auth";
import {SeededUser} from "../../helpers/types";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();

const cookieFor = (user: SeededUser) => authCookie({userId: user.id, email: user.email, role: "customer"});

const newAddress = {
    label: "Work",
    country: "Egypt",
    city: "Giza",
    street: "Pyramids Rd",
    building: "5",
    apartmentNumber: "12",
    type: "office",
    lat: 29.9792,
    lng: 31.1342,
    isDefault: true,
};

describe("customer addresses", () => {
    let customer: SeededUser;
    let otherCustomer: SeededUser;

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
        customer = await insertUser();
        otherCustomer = await insertUser();
    });

    describe("GET /api/customer/addresses", () => {
        it("lists only the caller's addresses with numeric coordinates", async () => {
            // Arrange
            const mine = await insertAddress(customer.id, {label: "Home", is_default: true});
            await insertAddress(otherCustomer.id, {label: "Not mine"});

            // Act
            const res = await request(app).get("/api/customer/addresses").set("Cookie", cookieFor(customer));

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                data: [{
                    id: mine,
                    label: "Home",
                    country: "Egypt",
                    city: "Cairo",
                    street: "Tahrir St",
                    building: "12",
                    apartmentNumber: "3",
                    type: "home",
                    lat: 30.0444,
                    lng: 31.2357,
                    isDefault: true,
                }],
            });
        });

        it("requires authentication", async () => {
            // Arrange
            const anonymous = request(app).get("/api/customer/addresses");

            // Act
            const res = await anonymous;

            // Assert
            expect(res.status).toBe(403);
        });
    });

    describe("POST /api/customer/addresses", () => {
        it("creates the address and returns it with 201", async () => {
            // Arrange
            const body = newAddress;

            // Act
            const res = await request(app).post("/api/customer/addresses").set("Cookie", cookieFor(customer)).send(body);

            // Assert
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Address created successfully");
            expect(res.body.data).toEqual({
                id: expect.any(Number),
                label: "Work",
                country: "Egypt",
                city: "Giza",
                street: "Pyramids Rd",
                building: "5",
                apartmentNumber: "12",
                type: "office",
                lat: 29.9792,
                lng: 31.1342,
                isDefault: true,
            });
            const stored = await db("customer_addresses").where({id: res.body.data.id}).first();
            expect(Number(stored.user_id)).toBe(customer.id);
        });

        it("moves the default flag to a new default address", async () => {
            // Arrange
            const oldDefault = await insertAddress(customer.id, {is_default: true});
            const othersDefault = await insertAddress(otherCustomer.id, {is_default: true});

            // Act
            const res = await request(app).post("/api/customer/addresses").set("Cookie", cookieFor(customer)).send({...newAddress, isDefault: true});

            // Assert
            expect(res.status).toBe(201);
            expect(await db("customer_addresses").where({id: oldDefault}).first("is_default")).toEqual({is_default: false});
            expect(await db("customer_addresses").where({id: othersDefault}).first("is_default")).toEqual({is_default: true});
        });

        it("keeps the existing default when the new address is not default", async () => {
            // Arrange
            const existingDefault = await insertAddress(customer.id, {is_default: true});

            // Act
            const res = await request(app).post("/api/customer/addresses").set("Cookie", cookieFor(customer)).send({...newAddress, isDefault: false});

            // Assert
            expect(res.status).toBe(201);
            expect(res.body.data.isDefault).toBe(false);
            expect(await db("customer_addresses").where({id: existingDefault}).first("is_default")).toEqual({is_default: true});
        });

        it("rejects an invalid address type", async () => {
            // Arrange
            const body = {...newAddress, type: "castle"};

            // Act
            const res = await request(app).post("/api/customer/addresses").set("Cookie", cookieFor(customer)).send(body);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("type must be one of the following values: home, office, public_place");
            expect(await db("customer_addresses").where({user_id: customer.id})).toHaveLength(0);
        });
    });

    describe("PATCH /api/customer/addresses/:addressId", () => {
        it("updates the caller's address and moves the default flag to it", async () => {
            // Arrange
            const oldDefault = await insertAddress(customer.id, {is_default: true});
            const target = await insertAddress(customer.id, {label: "Gym", is_default: false});

            // Act
            const res = await request(app)
                .patch(`/api/customer/addresses/${target}`)
                .set("Cookie", cookieFor(customer))
                .send({label: "Gym (new)", isDefault: true});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Address updated successfully");
            expect(res.body.data).toMatchObject({id: target, label: "Gym (new)", city: "Cairo", isDefault: true});
            expect(await db("customer_addresses").where({id: oldDefault}).first("is_default")).toEqual({is_default: false});
        });

        it("answers 404 for another customer's address", async () => {
            // Arrange
            const theirs = await insertAddress(otherCustomer.id);

            // Act
            const res = await request(app).patch(`/api/customer/addresses/${theirs}`).set("Cookie", cookieFor(customer)).send({label: "Mine now"});

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "Address not found"});
            expect(await db("customer_addresses").where({id: theirs}).first("label")).toEqual({label: "Home"});
        });

        it("rejects an invalid partial update", async () => {
            // Arrange
            const mine = await insertAddress(customer.id);

            // Act
            const res = await request(app).patch(`/api/customer/addresses/${mine}`).set("Cookie", cookieFor(customer)).send({lat: "north"});

            // Assert
            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /api/customer/addresses/:addressId", () => {
        it("deletes the caller's address", async () => {
            // Arrange
            const mine = await insertAddress(customer.id);

            // Act
            const res = await request(app).delete(`/api/customer/addresses/${mine}`).set("Cookie", cookieFor(customer));

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({message: "Address deleted successfully"});
            expect(await db("customer_addresses").where({id: mine})).toHaveLength(0);
        });

        it("refuses to delete another customer's or a missing address", async () => {
            // Arrange
            const theirs = await insertAddress(otherCustomer.id);

            // Act
            const foreign = await request(app).delete(`/api/customer/addresses/${theirs}`).set("Cookie", cookieFor(customer));
            const missing = await request(app).delete("/api/customer/addresses/99999").set("Cookie", cookieFor(customer));

            // Assert
            expect([foreign.status, missing.status]).toEqual([404, 404]);
            expect(await db("customer_addresses").where({id: theirs})).toHaveLength(1);
        });
    });

    describe("GET /api/customer/addresses/internal/:id", () => {
        it("returns the address with its owner for the order-service", async () => {
            // Arrange
            const id = await insertAddress(customer.id, {building: null, apartment_number: null});

            // Act
            const res = await request(app).get(`/api/customer/addresses/internal/${id}`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                success: true,
                data: {
                    id,
                    userId: customer.id,
                    label: "Home",
                    country: "Egypt",
                    city: "Cairo",
                    street: "Tahrir St",
                    building: null,
                    apartmentNumber: null,
                    lat: 30.0444,
                    lng: 31.2357,
                },
            });
        });

        it("answers 404 for an unknown address and 401 without the api key", async () => {
            // Arrange
            const id = await insertAddress(customer.id);

            // Act
            const unknown = await request(app).get("/api/customer/addresses/internal/99999").set(INTERNAL_HEADERS);
            const noKey = await request(app).get(`/api/customer/addresses/internal/${id}`);

            // Assert
            expect([unknown.status, noKey.status]).toEqual([404, 401]);
        });
    });
});
