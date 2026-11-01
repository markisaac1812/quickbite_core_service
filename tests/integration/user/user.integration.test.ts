import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertUser} from "../../helpers/factories";
import {authCookie, INTERNAL_HEADERS} from "../../helpers/auth";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();

const cookieFor = (user: {id: number; email: string}, role = "customer") => authCookie({userId: user.id, email: user.email, role});

afterAll(async () => {
    await db.destroy();
});

describe("users", () => {
    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
    });

    describe("GET /api/users/me", () => {
        it("returns the caller's profile without the password hash", async () => {
            // Arrange
            const user = await insertUser({email: "me@test.com", name: "Mona"});

            // Act
            const res = await request(app).get("/api/users/me").set("Cookie", cookieFor(user));

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({id: user.id, email: "me@test.com", phone: user.phone, name: "Mona", systemRole: "customer"});
        });

        it("answers 403 without an access token", async () => {
            // Arrange
            const noCookie = request(app).get("/api/users/me");

            // Act
            const res = await noCookie;

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "Invalid token credentials"});
        });

        it("answers 404 for a soft-deleted account", async () => {
            // Arrange
            const user = await insertUser({deleted_at: new Date()});

            // Act
            const res = await request(app).get("/api/users/me").set("Cookie", cookieFor(user));

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "User not found"});
        });
    });

    describe("PATCH /api/users/me", () => {
        it("updates name and phone and bumps updated_at", async () => {
            // Arrange
            const user = await insertUser({name: "Old"});
            const before = await db("users").where({id: user.id}).first("updated_at");

            // Act
            const res = await request(app).patch("/api/users/me").set("Cookie", cookieFor(user)).send({name: "New", phone: "01099998888"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                message: "User updated successfully",
                user: {id: user.id, email: user.email, name: "New", phone: "01099998888", systemRole: "customer"},
            });
            const after = await db("users").where({id: user.id}).first("updated_at");
            expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
        });

        it("rejects a phone outside 10-11 characters", async () => {
            // Arrange
            const user = await insertUser();

            // Act
            const res = await request(app).patch("/api/users/me").set("Cookie", cookieFor(user)).send({phone: "123"});

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "phone must be longer than or equal to 10 characters"});
        });

        it("answers 404 when the account no longer exists", async () => {
            // Arrange
            const ghost = {id: 4242, email: "ghost@test.com"};

            // Act
            const res = await request(app).patch("/api/users/me").set("Cookie", cookieFor(ghost)).send({name: "X"});

            // Assert
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/users/internal/agents/:id", () => {
        it("returns a delivery agent's public contact details", async () => {
            // Arrange
            const agent = await insertUser({system_role: "delivery_agent", name: "Ahmed"});

            // Act
            const res = await request(app).get(`/api/users/internal/agents/${agent.id}`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({success: true, data: {id: agent.id, name: "Ahmed", phone: agent.phone}});
        });

        it("hides non-agent and unknown users behind the same 404", async () => {
            // Arrange
            const customer = await insertUser();

            // Act
            const notAgent = await request(app).get(`/api/users/internal/agents/${customer.id}`).set(INTERNAL_HEADERS);
            const unknown = await request(app).get("/api/users/internal/agents/99999").set(INTERNAL_HEADERS);

            // Assert
            expect([notAgent.status, unknown.status]).toEqual([404, 404]);
            expect(notAgent.body).toEqual(unknown.body);
        });

        it("requires the internal api key", async () => {
            // Arrange
            const agent = await insertUser({system_role: "delivery_agent"});

            // Act
            const res = await request(app).get(`/api/users/internal/agents/${agent.id}`);

            // Assert
            expect(res.status).toBe(401);
        });
    });
});

describe("GET /api/health", () => {
    it("reports a reachable database", async () => {
        // Arrange
        const probe = request(app).get("/api/health");

        // Act
        const res = await probe;

        // Assert
        expect(res.status).toBe(200);
        expect(res.body).toEqual({message: "Database is healthy"});
    });
});
