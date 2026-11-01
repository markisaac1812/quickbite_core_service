import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {DEFAULT_PASSWORD, insertBranch, insertUser, seedMember, seedRestaurant} from "../../helpers/factories";
import {readCookie, signAccessToken, signRefreshToken} from "../../helpers/auth";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";
import {verifyAccessToken} from "../../../src/app/auth/utils";

const app = createApp();

afterAll(async () => {
    await db.destroy();
});

describe("POST /api/auth/login", () => {
    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
    });

    it("logs a customer in and sets the auth cookies", async () => {
        // Arrange
        const user = await insertUser({email: "customer@test.com"});

        // Act
        const res = await request(app).post("/api/auth/login").send({email: "customer@test.com", password: DEFAULT_PASSWORD});

        // Assert
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({message: "User logged in successfully", user: {id: user.id, email: "customer@test.com", systemRole: "customer"}});
        const claims = verifyAccessToken(readCookie(res.headers["set-cookie"], "access_token")!);
        expect(claims).toMatchObject({userId: user.id, role: "customer"});
        expect(claims).not.toHaveProperty("restaurantId");
        expect(readCookie(res.headers["set-cookie"], "refresh_token")).toBeDefined();
    });

    it("puts the restaurant, role and assigned branches into a staff member's token", async () => {
        // Arrange
        const {restaurantId} = await seedRestaurant();
        const branchId = await insertBranch(restaurantId);
        const staff = await seedMember(restaurantId, "staff", [branchId]);

        // Act
        const res = await request(app).post("/api/auth/login").send({email: staff.user.email, password: DEFAULT_PASSWORD});

        // Assert
        expect(res.status).toBe(200);
        const claims = verifyAccessToken(res.body.data.accessToken);
        expect(Number(claims.restaurantId)).toBe(restaurantId);
        expect(claims).toMatchObject({role: "restaurant_user", restaurantRole: "staff", branchIds: [branchId]});
    });

    it("rejects a wrong password and an unknown email with the same 401", async () => {
        // Arrange
        await insertUser({email: "customer@test.com"});

        // Act
        const wrongPassword = await request(app).post("/api/auth/login").send({email: "customer@test.com", password: "WrongPassword1!"});
        const unknownEmail = await request(app).post("/api/auth/login").send({email: "ghost@test.com", password: DEFAULT_PASSWORD});

        // Assert
        expect([wrongPassword.status, unknownEmail.status]).toEqual([401, 401]);
        expect(wrongPassword.body).toEqual({error: "Invalid credentials"});
        expect(unknownEmail.body).toEqual(wrongPassword.body);
        expect(wrongPassword.headers["set-cookie"]).toBeUndefined();
    });

    it("rejects a restaurant user whose membership is not active yet", async () => {
        // Arrange
        const {restaurantId} = await seedRestaurant();
        const invited = await seedMember(restaurantId, "staff", [], "inactive");

        // Act
        const res = await request(app).post("/api/auth/login").send({email: invited.user.email, password: DEFAULT_PASSWORD});

        // Assert
        expect(res.status).toBe(401);
    });

    it("rejects a soft-deleted user", async () => {
        // Arrange
        await insertUser({email: "gone@test.com", deleted_at: new Date()});

        // Act
        const res = await request(app).post("/api/auth/login").send({email: "gone@test.com", password: DEFAULT_PASSWORD});

        // Assert
        expect(res.status).toBe(401);
    });
});

describe("POST /api/auth/refresh", () => {
    it("issues a new access token carrying the refresh token's claims", async () => {
        // Arrange
        const claims = {userId: 5, role: "restaurant_user", email: "o@test.com", restaurantId: 3, restaurantRole: "owner", branchIds: [7]};

        // Act
        const res = await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${signRefreshToken(claims)}`);

        // Assert
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({message: "Token refreshed successfully."});
        expect(verifyAccessToken(readCookie(res.headers["set-cookie"], "access_token")!)).toMatchObject(claims);
    });

    it.each([
        ["expired", () => signRefreshToken({userId: 5, role: "customer", email: "c@test.com"}, -10)],
        ["tampered", () => signRefreshToken({userId: 5, role: "customer", email: "c@test.com"}).slice(0, -3) + "abc"],
        ["an access token", () => signAccessToken({userId: 5, role: "customer", email: "c@test.com"})],
        ["garbage", () => "not-a-jwt"],
    ])("answers 401 for a refresh token that is %s", async (_label, makeToken) => {
        // Arrange
        const cookie = `refresh_token=${makeToken()}`;

        // Act
        const res = await request(app).post("/api/auth/refresh").set("Cookie", cookie);

        // Assert
        expect(res.status).toBe(401);
        expect(res.body).toEqual({error: "Invalid refresh token"});
        expect(readCookie(res.headers["set-cookie"], "access_token")).toBeUndefined();
    });

    it("answers 401 when there is no refresh cookie", async () => {
        // Arrange
        const accessOnly = `access_token=${signAccessToken({userId: 5, role: "customer", email: "c@test.com"})}`;

        // Act
        const res = await request(app).post("/api/auth/refresh").set("Cookie", accessOnly);

        // Assert
        expect(res.status).toBe(401);
        expect(res.body).toEqual({error: "Invalid refresh token"});
    });
});
