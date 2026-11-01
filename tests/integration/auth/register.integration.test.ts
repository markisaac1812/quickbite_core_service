import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {DEFAULT_PASSWORD, insertUser} from "../../helpers/factories";
import {readCookie} from "../../helpers/auth";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";
import {verifyAccessToken, verifyRefreshToken} from "../../../src/app/auth/utils";

const app = createApp();

const customerBody = {email: "new@test.com", phone: "01011112222", name: "New Customer", password: DEFAULT_PASSWORD, role: "customer"};

describe("POST /api/auth/register", () => {
    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        emailStub.reset();
        cacheStub.reset();
    });

    it("creates a customer, returns the profile and sets both auth cookies", async () => {
        // Arrange
        const body = customerBody;

        // Act
        const res = await request(app).post("/api/auth/register").send(body);

        // Assert
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
            message: "User registered successfully",
            user: {email: "new@test.com", phone: "01011112222", systemRole: "customer"},
        });
        const accessToken = readCookie(res.headers["set-cookie"], "access_token")!;
        const refreshToken = readCookie(res.headers["set-cookie"], "refresh_token")!;
        expect(verifyAccessToken(accessToken)).toMatchObject({userId: res.body.data.user.id, role: "customer", email: "new@test.com"});
        expect(verifyRefreshToken(refreshToken).userId).toBe(res.body.data.user.id);
        const stored = await db("users").where({email: "new@test.com"}).first();
        expect(stored.password_hash).not.toBe(DEFAULT_PASSWORD);
    });

    it("creates a pending restaurant and an active owner membership for a restaurant user", async () => {
        // Arrange
        const body = {...customerBody, role: "restaurant_user", restaurant: {name: "Koshary Corner", primaryCountry: "EG"}};

        // Act
        const res = await request(app).post("/api/auth/register").send(body);

        // Assert
        expect(res.status).toBe(201);
        const userId = res.body.data.user.id;
        const restaurant = await db("restaurants").where({owner_id: userId}).first();
        expect(restaurant).toMatchObject({name: "Koshary Corner", status: "pending", primary_country: "EG", logo_url: ""});
        const member = await db("restaurant_members as rm").join("roles as r", "rm.role_id", "r.id").where("rm.user_id", userId).first("rm.status", "r.name");
        expect(member).toEqual({status: "active", name: "owner"});
        const claims = verifyAccessToken(res.body.data.accessToken);
        expect(Number(claims.restaurantId)).toBe(Number(restaurant.id));
        expect(claims).toMatchObject({restaurantRole: "owner", branchIds: []});
    });

    it("rolls the user back when a restaurant user omits the restaurant", async () => {
        // Arrange
        const body = {...customerBody, role: "restaurant_user"};

        // Act
        const res = await request(app).post("/api/auth/register").send(body);

        // Assert
        expect(res.status).toBe(400);
        expect(res.body).toEqual({error: "Restaurant data is missing"});
        expect(await db("users").count<{count: string}[]>("* as count")).toEqual([{count: "0"}]);
    });

    it("explains what is wrong with an invalid nested restaurant", async () => {
        // Arrange
        const body = {...customerBody, role: "restaurant_user", restaurant: {name: "Koshary Corner", primaryCountry: ""}};

        // Act
        const res = await request(app).post("/api/auth/register").send(body);

        // Assert
        expect(res.status).toBe(400);
        expect(res.body.error).toContain("primaryCountry should not be empty");
        expect(await db("users")).toHaveLength(0);
    });

    it("refuses self-registration as a system admin", async () => {
        // Arrange
        const body = {...customerBody, role: "system_admin"};

        // Act
        const res = await request(app).post("/api/auth/register").send(body);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body).toEqual({error: "You cannot register as a system admin"});
    });

    it("rejects an email or phone that is already registered", async () => {
        // Arrange
        await insertUser({email: "taken@test.com"});
        const samePhone = await insertUser();

        // Act
        const byEmail = await request(app).post("/api/auth/register").send({...customerBody, email: "taken@test.com"});
        const byPhone = await request(app).post("/api/auth/register").send({...customerBody, phone: samePhone.phone});

        // Assert
        expect([byEmail.status, byPhone.status]).toEqual([400, 400]);
        expect(byEmail.body).toEqual({error: "User already exists"});
    });

    it("rejects an invalid payload with 400 before touching the DB", async () => {
        // Arrange
        const body = {...customerBody, email: "not-an-email"};

        // Act
        const res = await request(app).post("/api/auth/register").send(body);

        // Assert
        expect(res.status).toBe(400);
        expect(res.body).toEqual({error: "email must be an email"});
    });
});
