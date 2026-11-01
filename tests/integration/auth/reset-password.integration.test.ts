import "reflect-metadata";
import {randomUUID} from "crypto";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertPasswordReset, insertUser, seedMember, seedRestaurant} from "../../helpers/factories";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();
const NEW_PASSWORD = "BrandNewPass456!";

function otpFromEmail(html: string): string {
    return html.match(/>\s*(\d{6})\s*</)![1];
}

describe("password reset flow", () => {
    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        emailStub.reset();
        cacheStub.reset();
    });

    describe("POST /api/auth/forget-password", () => {
        it("answers 200 without emailing when the address is unknown (no user enumeration)", async () => {
            // Arrange
            const body = {email: "ghost@test.com"};

            // Act
            const res = await request(app).post("/api/auth/forget-password").set("idempotency-key", randomUUID()).send(body);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({message: "If the email exists, an OTP has been sent."});
            expect(emailStub.sent).toHaveLength(0);
        });

        it("replays the first response for a repeated idempotency key", async () => {
            // Arrange
            await insertUser({email: "customer@test.com"});
            const key = randomUUID();
            await request(app).post("/api/auth/forget-password").set("idempotency-key", key).send({email: "customer@test.com"});

            // Act
            const replay = await request(app).post("/api/auth/forget-password").set("idempotency-key", key).send({email: "customer@test.com"});

            // Assert
            expect(replay.status).toBe(200);
            expect(replay.body.success).toBe(true);
            expect(emailStub.sent).toHaveLength(1);
            expect(await db("password_resets").count<{count: string}[]>("* as count")).toEqual([{count: "1"}]);
        });

        it("requires an idempotency key", async () => {
            // Arrange
            const body = {email: "customer@test.com"};

            // Act
            const res = await request(app).post("/api/auth/forget-password").send(body);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "Missing Idempotency-Key header"});
        });

        it("answers 503 when the idempotency store is down", async () => {
            // Arrange
            cacheStub.failWith = new Error("ECONNREFUSED");

            // Act
            const res = await request(app).post("/api/auth/forget-password").set("idempotency-key", randomUUID()).send({email: "c@test.com"});

            // Assert
            expect(res.status).toBe(503);
        });
    });

    describe("POST /api/auth/reset-password", () => {
        it("resets the password with the emailed OTP, consumes it, and the new password logs in", async () => {
            // Arrange
            const user = await insertUser({email: "customer@test.com"});
            await request(app).post("/api/auth/forget-password").set("idempotency-key", randomUUID()).send({email: user.email});
            const otp = otpFromEmail(emailStub.sent[0].body);

            // Act
            const res = await request(app).post("/api/auth/reset-password").send({email: user.email, otp, newPassword: NEW_PASSWORD});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({message: "Password reset successfully. Please login again."});
            const reset = await db("password_resets").where({user_id: user.id}).first();
            expect(reset.consumed_at).toBeInstanceOf(Date);
            const login = await request(app).post("/api/auth/login").send({email: user.email, password: NEW_PASSWORD});
            expect(login.status).toBe(200);
            const reuse = await request(app).post("/api/auth/reset-password").send({email: user.email, otp, newPassword: NEW_PASSWORD});
            expect(reuse.status).toBe(400);
        });

        it("rejects a wrong OTP", async () => {
            // Arrange
            const user = await insertUser();
            await insertPasswordReset(user.id, "123456");

            // Act
            const res = await request(app).post("/api/auth/reset-password").send({email: user.email, otp: "654321", newPassword: NEW_PASSWORD});

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "Invalid OTP"});
        });

        it("rejects an expired OTP", async () => {
            // Arrange
            const user = await insertUser();
            await insertPasswordReset(user.id, "123456", {expiresAt: new Date(Date.now() - 60_000)});

            // Act
            const res = await request(app).post("/api/auth/reset-password").send({email: user.email, otp: "123456", newPassword: NEW_PASSWORD});

            // Assert
            expect(res.status).toBe(400);
        });

        it("only honours the latest unconsumed OTP", async () => {
            // Arrange
            const user = await insertUser();
            await insertPasswordReset(user.id, "111111");
            await insertPasswordReset(user.id, "222222");

            // Act
            const older = await request(app).post("/api/auth/reset-password").send({email: user.email, otp: "111111", newPassword: NEW_PASSWORD});
            const latest = await request(app).post("/api/auth/reset-password").send({email: user.email, otp: "222222", newPassword: NEW_PASSWORD});

            // Assert
            expect([older.status, latest.status]).toEqual([400, 200]);
        });

        it("rejects an unknown email or a user who never requested a reset", async () => {
            // Arrange
            const user = await insertUser();

            // Act
            const unknown = await request(app).post("/api/auth/reset-password").send({email: "ghost@test.com", otp: "123456", newPassword: NEW_PASSWORD});
            const neverRequested = await request(app).post("/api/auth/reset-password").send({email: user.email, otp: "123456", newPassword: NEW_PASSWORD});

            // Assert
            expect([unknown.status, neverRequested.status]).toEqual([400, 400]);
        });
    });

    describe("POST /api/auth/accept-invite", () => {
        it("sets the invitee's password and activates the membership", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const invitee = await seedMember(restaurantId, "staff", [], "inactive");
            await insertPasswordReset(invitee.user.id, "246810");

            // Act
            const res = await request(app).post("/api/auth/accept-invite").send({email: invitee.user.email, otp: "246810", newPassword: NEW_PASSWORD});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({message: "Invitation accepted successfully, please login again"});
            expect(await db("restaurant_members").where({id: invitee.memberId}).first("status")).toEqual({status: "active"});
            const login = await request(app).post("/api/auth/login").send({email: invitee.user.email, password: NEW_PASSWORD});
            expect(login.status).toBe(200);
        });

        it("leaves the membership inactive when the OTP is wrong", async () => {
            // Arrange
            const {restaurantId} = await seedRestaurant();
            const invitee = await seedMember(restaurantId, "staff", [], "inactive");
            await insertPasswordReset(invitee.user.id, "246810");

            // Act
            const res = await request(app).post("/api/auth/accept-invite").send({email: invitee.user.email, otp: "000000", newPassword: NEW_PASSWORD});

            // Assert
            expect(res.status).toBe(400);
            expect(await db("restaurant_members").where({id: invitee.memberId}).first("status")).toEqual({status: "inactive"});
        });
    });
});
