import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertBranch, insertCategory, insertProduct, outboxEvents, seedMember, seedRestaurant, setBranchProduct} from "../../helpers/factories";
import {ADMIN, authCookie} from "../../helpers/auth";
import {SeededRestaurant} from "../../helpers/types";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";

const app = createApp();

async function stockOf(branchId: number, productId: number) {
    return db("product_branch_details").where({branch_id: branchId, product_id: productId}).first("price", "stock", "is_available");
}

describe("products", () => {
    let restaurant: SeededRestaurant;
    let branchId: number;

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        cacheStub.reset();
        restaurant = await seedRestaurant();
        branchId = await insertBranch(restaurant.restaurantId);
    });

    describe("public catalogue", () => {
        it("lists a restaurant's categories", async () => {
            // Arrange
            await insertCategory(restaurant.restaurantId, "Mains");
            await insertCategory(restaurant.restaurantId, "Drinks");

            // Act
            const res = await request(app).get(`/api/restaurants/${restaurant.restaurantId}/categories`);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.map((c: {name: string}) => c.name).sort()).toEqual(["Drinks", "Mains"]);
        });

        it("answers 404 for the categories of an unknown restaurant", async () => {
            // Arrange
            const unknownId = 4242;

            // Act
            const res = await request(app).get(`/api/restaurants/${unknownId}/categories`);

            // Assert
            expect(res.status).toBe(404);
        });

        it("lists a branch menu with branch price, stock and category, hiding deleted products", async () => {
            // Arrange
            const categoryId = await insertCategory(restaurant.restaurantId, "Mains");
            const koshary = await insertProduct(restaurant.restaurantId, {name: "Koshary", category_id: categoryId});
            const gone = await insertProduct(restaurant.restaurantId, {name: "Discontinued", deleted_at: new Date()});
            await setBranchProduct(branchId, koshary, {price: 7500, stock: 10, is_available: true});
            await setBranchProduct(branchId, gone, {price: 100, stock: 1, is_available: true});

            // Act
            const res = await request(app).get(`/api/branches/${branchId}/products`);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({name: "Koshary", categoryName: "Mains", price: 7500, stock: 10, isAvailable: true});
        });

        it("answers 404 for the menu of an unknown branch", async () => {
            // Arrange
            const unknownId = 99999;

            // Act
            const res = await request(app).get(`/api/branches/${unknownId}/products`);

            // Assert
            expect(res.status).toBe(404);
            expect(res.body).toEqual({error: "Branch not found"});
        });

        it("returns a single product and 404s a deleted one", async () => {
            // Arrange
            const live = await insertProduct(restaurant.restaurantId, {name: "Koshary"});
            const gone = await insertProduct(restaurant.restaurantId, {deleted_at: new Date()});

            // Act
            const ok = await request(app).get(`/api/products/${live}`);
            const missing = await request(app).get(`/api/products/${gone}`);

            // Assert
            expect(ok.status).toBe(200);
            expect(ok.body.data).toMatchObject({name: "Koshary", description: "Rice, lentils, pasta"});
            expect(missing.status).toBe(404);
            expect(missing.body).toEqual({error: "Product not found"});
        });
    });

    describe("GET /api/restaurants/:restaurantId/products", () => {
        it("lists the restaurant's live products for the owner and for an admin", async () => {
            // Arrange
            await insertProduct(restaurant.restaurantId, {name: "Koshary"});
            await insertProduct(restaurant.restaurantId, {name: "Gone", deleted_at: new Date()});

            // Act
            const byOwner = await request(app).get(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(restaurant.ownerJwt));
            const byAdmin = await request(app).get(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(ADMIN));

            // Assert
            expect([byOwner.status, byAdmin.status]).toEqual([200, 200]);
            expect(byOwner.body.data.map((p: {name: string}) => p.name)).toEqual(["Koshary"]);
        });

        it("still requires ownership after RBAC lets staff read", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff", [branchId]);

            // Act
            const res = await request(app).get(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(staff.jwt));

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You are not authorised to perform this action"});
        });

        it("answers 404 for an admin asking about an unknown restaurant", async () => {
            // Arrange
            const unknownId = 4242;

            // Act
            const res = await request(app).get(`/api/restaurants/${unknownId}/products`).set("Cookie", authCookie(ADMIN));

            // Assert
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/restaurants/:restaurantId/products", () => {
        it("creates the product, its category, and a hidden 0-stock row per branch", async () => {
            // Arrange
            const secondBranch = await insertBranch(restaurant.restaurantId, {label: "Maadi"});
            const body = {name: "Mint tea", description: "Fresh", imageUrl: "tea.png", categoryName: "Drinks"};

            // Act
            const res = await request(app).post(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(restaurant.ownerJwt)).send(body);

            // Assert
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Product created successfully");
            expect(res.body.data).toMatchObject({name: "Mint tea", description: "Fresh", imageUrl: "tea.png"});
            const category = await db("product_categories").where({restaurant_id: restaurant.restaurantId, name: "Drinks"}).first("id");
            expect(Number(res.body.data.categoryId)).toBe(Number(category.id));
            const productId = Number(res.body.data.id);
            expect(await stockOf(branchId, productId)).toEqual({price: 0, stock: 0, is_available: false});
            expect(await stockOf(secondBranch, productId)).toEqual({price: 0, stock: 0, is_available: false});
        });

        it("reuses an existing category and allows uncategorised products", async () => {
            // Arrange
            const existing = await insertCategory(restaurant.restaurantId, "Drinks");

            // Act
            const categorised = await request(app).post(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(restaurant.ownerJwt)).send({name: "Karkade", categoryName: "Drinks"});
            const plain = await request(app).post(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(restaurant.ownerJwt)).send({name: "Bread"});

            // Assert
            expect(Number(categorised.body.data.categoryId)).toBe(existing);
            expect(plain.body.data.categoryId).toBeNull();
            expect(await db("product_categories")).toHaveLength(1);
        });

        it("denies staff (no core:product:create) and non-owner managers", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff");
            const manager = await seedMember(restaurant.restaurantId, "branch_manager");

            // Act
            const byStaff = await request(app).post(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(staff.jwt)).send({name: "X"});
            const byManager = await request(app).post(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(manager.jwt)).send({name: "X"});

            // Assert
            expect(byStaff.status).toBe(403);
            expect(byStaff.body).toEqual({error: "Permission denied"});
            expect(byManager.status).toBe(403);
            expect(byManager.body).toEqual({error: "You are not authorised to perform this action"});
        });

        it("validates the body and 404s an unknown restaurant", async () => {
            // Arrange
            const body = {description: "no name"};

            // Act
            const invalid = await request(app).post(`/api/restaurants/${restaurant.restaurantId}/products`).set("Cookie", authCookie(restaurant.ownerJwt)).send(body);
            const unknown = await request(app).post("/api/restaurants/4242/products").set("Cookie", authCookie(ADMIN)).send({name: "X"});

            // Assert
            expect([invalid.status, unknown.status]).toEqual([400, 404]);
        });
    });

    describe("PATCH /api/products/:productId", () => {
        it("updates the product without branch overrides when no branchId is given", async () => {
            // Arrange
            const productId = await insertProduct(restaurant.restaurantId, {name: "Koshary"});

            // Act
            const res = await request(app).patch(`/api/products/${productId}`).set("Cookie", authCookie(restaurant.ownerJwt)).send({name: "Koshary XL", categoryName: "Mains", price: 9000});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.product).toMatchObject({name: "Koshary XL"});
            expect(res.body.data.product.categoryId).not.toBeNull();
            expect(res.body.data).not.toHaveProperty("branchDetails");
            expect(await outboxEvents()).toEqual([]);
        });

        it("reuses the category when renaming into an existing one", async () => {
            // Arrange
            const mains = await insertCategory(restaurant.restaurantId, "Mains");
            const productId = await insertProduct(restaurant.restaurantId);

            // Act
            const res = await request(app).patch(`/api/products/${productId}`).set("Cookie", authCookie(restaurant.ownerJwt)).send({categoryName: "Mains"});

            // Assert
            expect(Number(res.body.data.product.categoryId)).toBe(mains);
        });

        it("applies a branch price override and emits product.price.changed", async () => {
            // Arrange
            const productId = await insertProduct(restaurant.restaurantId);
            await setBranchProduct(branchId, productId, {price: 7500, stock: 10});

            // Act
            const res = await request(app).patch(`/api/products/${productId}?branchId=${branchId}`).set("Cookie", authCookie(restaurant.ownerJwt)).send({price: 9000});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.data.branchDetails).toMatchObject({price: 9000, stock: 10, isAvailable: true});
            expect(await outboxEvents()).toEqual([{
                event_type: "product.price.changed",
                aggregate_type: "product_branch_details",
                aggregate_id: `${branchId}:${productId}`,
                payload: {branchId, productId, newPrice: 9000},
            }]);
        });

        it("emits product.stock.changed for stock / availability overrides", async () => {
            // Arrange
            const productId = await insertProduct(restaurant.restaurantId);

            // Act
            const res = await request(app).patch(`/api/products/${productId}?branchId=${branchId}`).set("Cookie", authCookie(restaurant.ownerJwt)).send({stock: 25, isAvailable: true});

            // Assert
            expect(res.status).toBe(200);
            expect(await stockOf(branchId, productId)).toEqual({price: 0, stock: 25, is_available: true});
            expect(await outboxEvents()).toEqual([{
                event_type: "product.stock.changed",
                aggregate_type: "product_branch_details",
                aggregate_id: `${branchId}:${productId}`,
                payload: {branchId, productId, newStock: 25, isAvailable: true},
            }]);
        });

        it("denies staff on a branch they are not assigned to", async () => {
            // Arrange
            const productId = await insertProduct(restaurant.restaurantId);
            const otherBranch = await insertBranch(restaurant.restaurantId);
            const staff = await seedMember(restaurant.restaurantId, "staff", [otherBranch]);

            // Act
            const res = await request(app).patch(`/api/products/${productId}?branchId=${branchId}`).set("Cookie", authCookie(staff.jwt)).send({stock: 0});

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "You do not have access to this branch"});
        });

        it("denies a non-owner manager and 404s an unknown product", async () => {
            // Arrange
            const productId = await insertProduct(restaurant.restaurantId);
            const manager = await seedMember(restaurant.restaurantId, "branch_manager", [branchId]);

            // Act
            const byManager = await request(app).patch(`/api/products/${productId}`).set("Cookie", authCookie(manager.jwt)).send({name: "X"});
            const unknown = await request(app).patch("/api/products/99999").set("Cookie", authCookie(restaurant.ownerJwt)).send({name: "X"});

            // Assert
            expect([byManager.status, unknown.status]).toEqual([403, 404]);
        });
    });
});
