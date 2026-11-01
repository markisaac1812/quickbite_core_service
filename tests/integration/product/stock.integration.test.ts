import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertBranch, insertProduct, outboxEvents, seedRestaurant, setBranchProduct} from "../../helpers/factories";
import {INTERNAL_HEADERS} from "../../helpers/auth";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();

async function stockOf(branchId: number, productId: number): Promise<number> {
    const row = await db("product_branch_details").where({branch_id: branchId, product_id: productId}).first("stock");
    return row.stock;
}

describe("internal branch stock endpoints", () => {
    let branchId: number;
    let koshary: number;
    let tea: number;

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
        const {restaurantId} = await seedRestaurant();
        branchId = await insertBranch(restaurantId);
        koshary = await insertProduct(restaurantId, {name: "Koshary", image_url: "koshary.png"});
        tea = await insertProduct(restaurantId, {name: "Mint tea"});
        await setBranchProduct(branchId, koshary, {price: 7500, stock: 10, is_available: true});
        await setBranchProduct(branchId, tea, {price: 1000, stock: 2, is_available: true});
    });

    describe("GET /api/internal/branches/:id/products?ids=", () => {
        it("returns the branch price and stock for the requested products", async () => {
            // Arrange
            const ids = `${koshary},${tea},99999`;

            // Act
            const res = await request(app).get(`/api/internal/branches/${branchId}/products?ids=${ids}`).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(200);
            const rows = res.body.data.map((r: {productId: string}) => ({...r, productId: Number(r.productId)}));
            expect(rows).toEqual(expect.arrayContaining([
                {productId: koshary, name: "Koshary", imageUrl: "koshary.png", price: 7500, stock: 10, isAvailable: true},
                {productId: tea, name: "Mint tea", imageUrl: null, price: 1000, stock: 2, isAvailable: true},
            ]));
            expect(rows).toHaveLength(2);
        });

        it("requires a non-empty ids query", async () => {
            // Arrange
            const url = `/api/internal/branches/${branchId}/products?ids=abc`;

            // Act
            const res = await request(app).get(url).set(INTERNAL_HEADERS);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "ids query is required"});
        });
    });

    describe("POST /api/internal/branches/:id/reserve-stock", () => {
        it("decrements every item and emits one product.stock.changed per item", async () => {
            // Arrange
            const items = [{productId: koshary, quantity: 3}, {productId: tea, quantity: 2}];

            // Act
            const res = await request(app).post(`/api/internal/branches/${branchId}/reserve-stock`).set(INTERNAL_HEADERS).send({items});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ok: true, applied: [{productId: koshary, newStock: 7}, {productId: tea, newStock: 0}]});
            expect([await stockOf(branchId, koshary), await stockOf(branchId, tea)]).toEqual([7, 0]);
            expect((await outboxEvents()).map((e) => e.payload)).toEqual([
                {branchId, productId: koshary, newStock: 7},
                {branchId, productId: tea, newStock: 0},
            ]);
        });

        it("reserves nothing when any item is short, reporting every offender", async () => {
            // Arrange
            const items = [{productId: koshary, quantity: 1}, {productId: tea, quantity: 5}];

            // Act
            const res = await request(app).post(`/api/internal/branches/${branchId}/reserve-stock`).set(INTERNAL_HEADERS).send({items});

            // Assert
            expect(res.status).toBe(409);
            expect(res.body.error).toBe(`OutOfStock: ${JSON.stringify([{productId: tea, requested: 5, available: 2}])}`);
            expect([await stockOf(branchId, koshary), await stockOf(branchId, tea)]).toEqual([10, 2]);
            expect(await outboxEvents()).toEqual([]);
        });

        it("treats unavailable and unknown products as having no stock", async () => {
            // Arrange
            await setBranchProduct(branchId, koshary, {is_available: false});
            const items = [{productId: koshary, quantity: 1}, {productId: 99999, quantity: 1}];

            // Act
            const res = await request(app).post(`/api/internal/branches/${branchId}/reserve-stock`).set(INTERNAL_HEADERS).send({items});

            // Assert
            expect(res.status).toBe(409);
            expect(res.body.error).toBe(`OutOfStock: ${JSON.stringify([
                {productId: koshary, requested: 1, available: 0},
                {productId: 99999, requested: 1, available: 0},
            ])}`);
        });

        it("rejects an empty list or a non-positive quantity", async () => {
            // Arrange
            const url = `/api/internal/branches/${branchId}/reserve-stock`;

            // Act
            const empty = await request(app).post(url).set(INTERNAL_HEADERS).send({items: []});
            const zero = await request(app).post(url).set(INTERNAL_HEADERS).send({items: [{productId: koshary, quantity: 0}]});

            // Assert
            expect([empty.status, zero.status]).toEqual([400, 400]);
            expect(zero.body).toEqual({error: "items must be a non-empty array of {productId, quantity}"});
            expect(await stockOf(branchId, koshary)).toBe(10);
        });
    });

    describe("POST /api/internal/branches/:id/release-stock", () => {
        it("adds the quantities back in one bulk update and skips unknown products", async () => {
            // Arrange
            const items = [{productId: koshary, quantity: 3}, {productId: tea, quantity: 1}, {productId: 99999, quantity: 4}];

            // Act
            const res = await request(app).post(`/api/internal/branches/${branchId}/release-stock`).set(INTERNAL_HEADERS).send({items});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ok: true, applied: [{productId: koshary, newStock: 13}, {productId: tea, newStock: 3}]});
            expect([await stockOf(branchId, koshary), await stockOf(branchId, tea)]).toEqual([13, 3]);
            expect((await outboxEvents()).map((e) => [e.event_type, e.aggregate_id])).toEqual([
                ["product.stock.changed", `${branchId}:${koshary}`],
                ["product.stock.changed", `${branchId}:${tea}`],
            ]);
        });

        it("is a no-op when none of the products exist on the branch", async () => {
            // Arrange
            const items = [{productId: 99999, quantity: 1}];

            // Act
            const res = await request(app).post(`/api/internal/branches/${branchId}/release-stock`).set(INTERNAL_HEADERS).send({items});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ok: true, applied: []});
            expect(await outboxEvents()).toEqual([]);
        });

        it("rejects malformed items and a missing api key", async () => {
            // Arrange
            const url = `/api/internal/branches/${branchId}/release-stock`;

            // Act
            const malformed = await request(app).post(url).set(INTERNAL_HEADERS).send({items: [{productId: "abc", quantity: 1}]});
            const notArray = await request(app).post(url).set(INTERNAL_HEADERS).send({items: "all"});
            const noKey = await request(app).post(url).send({items: [{productId: koshary, quantity: 1}]});

            // Assert
            expect([malformed.status, notArray.status, noKey.status]).toEqual([400, 400, 401]);
            expect(await stockOf(branchId, koshary)).toBe(10);
        });
    });
});
