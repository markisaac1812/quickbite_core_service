import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {storageStub} from "../../helpers/storage-stub";
import {truncateAll} from "../../helpers/db";
import {insertUser, seedMember, seedRestaurant} from "../../helpers/factories";
import {ADMIN, authCookie} from "../../helpers/auth";
import {SeededRestaurant} from "../../helpers/types";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));
jest.mock("../../../src/lib/storage/init", () => ({storageProvider: storageStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";
import {JwtPayload} from "../../../src/app/auth/utils";

const app = createApp();

const UPLOAD_URL = "/api/media/upload-url";
const confirmUrl = (id: number | string) => `/api/media/${id}/confirm`;
const PNG = {contentType: "image/png", size: 2048};

describe("media (direct-to-S3 presigned upload)", () => {
    let restaurant: SeededRestaurant;

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
        storageStub.reset();
        restaurant = await seedRestaurant();
    });

    async function requestUploadUrl(jwt: JwtPayload, body: object = PNG) {
        return request(app).post(UPLOAD_URL).set("Cookie", authCookie(jwt)).send(body);
    }

    async function adminJwt(): Promise<JwtPayload> {
        const admin = await insertUser({system_role: "system_admin"});
        return {...ADMIN, userId: admin.id, email: admin.email};
    }

    describe("POST /media/upload-url", () => {
        it("returns a presigned PUT url and records a pending media row for the owner's restaurant", async () => {
            // Act
            const res = await requestUploadUrl(restaurant.ownerJwt);

            // Assert
            expect(res.status).toBe(201);
            const data = res.body.data;
            expect(data).toMatchObject({method: "PUT", headers: {"Content-Type": "image/png"}, expiresIn: 300});
            expect(data.key).toMatch(new RegExp(`^restaurants/${restaurant.restaurantId}/[0-9a-f-]{36}\\.png$`));
            expect(data.uploadUrl).toContain(data.key);
            expect(data.url).toBe(`https://test-bucket.example.com/${data.key}`);

            // the declared size/type are what get signed into the URL
            expect(storageStub.presigned).toEqual([{key: data.key, contentType: "image/png", contentLength: 2048, expiresInSeconds: 300}]);

            const row = await db("media").where("id", data.mediaId).first();
            expect(row).toMatchObject({
                status: "pending",
                restaurant_id: String(restaurant.restaurantId),
                uploaded_by: String(restaurant.owner.id),
                mime_type: "image/png",
                size_bytes: 2048,
                key: data.key,
            });
        });

        it("maps jpeg and webp to the right extension", async () => {
            const jpg = await requestUploadUrl(restaurant.ownerJwt, {contentType: "image/jpeg", size: 10});
            const webp = await requestUploadUrl(restaurant.ownerJwt, {contentType: "image/webp", size: 10});

            expect(jpg.body.data.key).toMatch(/\.jpg$/);
            expect(webp.body.data.key).toMatch(/\.webp$/);
        });

        it("lets any member of the restaurant request a url", async () => {
            const staff = await seedMember(restaurant.restaurantId, "staff");

            const res = await requestUploadUrl(staff.jwt);

            expect(res.status).toBe(201);
        });

        it("lets a system admin request a url for any restaurant via restaurantId", async () => {
            const res = await requestUploadUrl(await adminJwt(), {...PNG, restaurantId: restaurant.restaurantId});

            expect(res.status).toBe(201);
            expect(res.body.data.key).toMatch(new RegExp(`^restaurants/${restaurant.restaurantId}/`));
        });

        it("requires restaurantId from a system admin", async () => {
            const res = await requestUploadUrl(await adminJwt());

            expect(res.status).toBe(400);
        });

        it("answers 404 when an admin targets an unknown restaurant", async () => {
            const res = await requestUploadUrl(await adminJwt(), {...PNG, restaurantId: 4242});

            expect(res.status).toBe(404);
        });

        it("forbids a restaurant user from targeting another restaurant", async () => {
            const other = await seedRestaurant();

            const res = await requestUploadUrl(restaurant.ownerJwt, {...PNG, restaurantId: other.restaurantId});

            expect(res.status).toBe(403);
            expect(await db("media").count({n: "*"}).first()).toEqual({n: "0"});
        });

        it("rejects unauthenticated requests", async () => {
            const res = await request(app).post(UPLOAD_URL).send(PNG);

            expect(res.status).toBe(403);
        });

        it("rejects customers", async () => {
            const customer = await insertUser({system_role: "customer"});

            const res = await requestUploadUrl({userId: customer.id, role: "customer", email: customer.email});

            expect(res.status).toBe(403);
            expect(storageStub.presigned).toHaveLength(0);
        });

        it.each([
            ["a disallowed content type", {contentType: "application/pdf", size: 10}],
            ["an svg (can carry scripts)", {contentType: "image/svg+xml", size: 10}],
            ["a size over the limit", {contentType: "image/png", size: 1024 * 1024 + 1}], // .env.test caps at 1MB
            ["a zero size", {contentType: "image/png", size: 0}],
            ["a missing size", {contentType: "image/png"}],
        ])("answers 400 for %s", async (_label, body) => {
            const res = await requestUploadUrl(restaurant.ownerJwt, body);

            expect(res.status).toBe(400);
            expect(storageStub.presigned).toHaveLength(0);
        });
    });

    describe("POST /media/:id/confirm", () => {
        async function pendingUpload(jwt: JwtPayload = restaurant.ownerJwt) {
            const res = await requestUploadUrl(jwt);
            return res.body.data as {mediaId: number; key: string; url: string};
        }

        it("marks the media uploaded once the object exists in S3 with the approved type and size", async () => {
            // Arrange
            const {mediaId, key, url} = await pendingUpload();
            storageStub.simulateClientPut(key, {contentType: "image/png", contentLength: 2048});

            // Act
            const res = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({id: mediaId, status: "uploaded", url, key});
            expect((await db("media").where("id", mediaId).first()).status).toBe("uploaded");
        });

        it("is idempotent once uploaded", async () => {
            const {mediaId, key} = await pendingUpload();
            storageStub.simulateClientPut(key, {contentType: "image/png", contentLength: 2048});
            await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));

            const again = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));

            expect(again.status).toBe(200);
            expect(again.body.data.status).toBe("uploaded");
        });

        it("answers 400 and keeps the row pending when the file was not uploaded yet", async () => {
            const {mediaId} = await pendingUpload();

            const res = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));

            expect(res.status).toBe(400);
            expect((await db("media").where("id", mediaId).first()).status).toBe("pending");
        });

        it("marks failed and deletes the object when it does not match what was approved", async () => {
            const {mediaId, key} = await pendingUpload();
            storageStub.simulateClientPut(key, {contentType: "text/html", contentLength: 2048});

            const res = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));

            expect(res.status).toBe(400);
            expect(storageStub.deleted).toEqual([key]);
            expect((await db("media").where("id", mediaId).first()).status).toBe("failed");

            const retry = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));
            expect(retry.status).toBe(409);
        });

        it("lets another member of the same restaurant confirm", async () => {
            const {mediaId, key} = await pendingUpload();
            storageStub.simulateClientPut(key, {contentType: "image/png", contentLength: 2048});
            const staff = await seedMember(restaurant.restaurantId, "staff");

            const res = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(staff.jwt));

            expect(res.status).toBe(200);
        });

        it("lets a system admin confirm any media", async () => {
            const {mediaId, key} = await pendingUpload();
            storageStub.simulateClientPut(key, {contentType: "image/png", contentLength: 2048});

            const res = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(await adminJwt()));

            expect(res.status).toBe(200);
        });

        it("hides another restaurant's media (404)", async () => {
            const {mediaId, key} = await pendingUpload();
            storageStub.simulateClientPut(key, {contentType: "image/png", contentLength: 2048});
            const other = await seedRestaurant();

            const res = await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(other.ownerJwt));

            expect(res.status).toBe(404);
            expect((await db("media").where("id", mediaId).first()).status).toBe("pending");
        });

        it("answers 404 for unknown or malformed ids", async () => {
            const unknown = await request(app).post(confirmUrl(999)).set("Cookie", authCookie(restaurant.ownerJwt));
            const malformed = await request(app).post(confirmUrl("abc")).set("Cookie", authCookie(restaurant.ownerJwt));

            expect(unknown.status).toBe(404);
            expect(malformed.status).toBe(404);
        });

        it("rejects unauthenticated requests", async () => {
            const {mediaId} = await pendingUpload();

            const res = await request(app).post(confirmUrl(mediaId));

            expect(res.status).toBe(403);
        });
    });

    it("full flow: the confirmed url can be used as a product image", async () => {
        const {mediaId, key, url} = (await requestUploadUrl(restaurant.ownerJwt)).body.data;
        storageStub.simulateClientPut(key, {contentType: "image/png", contentLength: 2048});
        await request(app).post(confirmUrl(mediaId)).set("Cookie", authCookie(restaurant.ownerJwt));

        const res = await request(app)
            .post(`/api/restaurants/${restaurant.restaurantId}/products`)
            .set("Cookie", authCookie(restaurant.ownerJwt))
            .send({name: "Koshary", imageUrl: url});

        expect(res.status).toBe(201);
        expect(res.body.data.imageUrl).toBe(url);
    });
});
