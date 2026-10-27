import { findRestaurantById } from "../../restaurant/repository/restaurant.repository"
import { RestaurantNotFoundError } from "../../restaurant/errors";
import { findCategoriesByRestaurantId,findCategoryByName,createCategory } from "../repository/product-category.repo";
import {findBranchById} from "../../branch/repository/branch.repository";
import { BranchNotFoundError } from "../../branch/erros";
import { createProduct, findProductById, findProductByrestaurantId, findProductsByBranch,updateProduct } from "../repository/product.repo";
import { SystemRole } from "../../user/entity/enums";
import { UnAuthorisedError } from "../../../lib/auth/errors";
import { ProductNotFoundError,InvalidReserveItemsError, outOfStockError } from "../error";
import {db} from "../../../lib/knex/knex";
import {insertOutboxEvent,insertOutboxEvents} from "../../../lib/events/outbox.repo";
import {EVENT_TYPES} from "../../../lib/events/event-types";
import { CreateProductDTO,UpdateProductDTO } from "../dto/product.dto";
import { updateBranchDetails } from "../repository/product-branch.repo";
import { injectable } from "tsyringe";
import { BranchProductRow,ReserveStockApplied,ReserveStockInput,ReserveStockResult,OutOfStockItem } from "../types";
import {Knex} from "knex";

@injectable()
export class ProductService {
    findCategoriesByRestaurantId = async(restaurantId: number)=> {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }
        return await findCategoriesByRestaurantId(restaurantId);
    }

    findProductsByBranch = async(branchId: number)=> {
        const branch = await findBranchById(branchId);
        if(!branch) {
            throw BranchNotFoundError;
        }
        return await findProductsByBranch(branchId);
    }

    findProductByrestaurantId = async(restaurantId: number,userId: number,userRole: SystemRole) => {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }

        if(userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
                    throw UnAuthorisedError;
        };
        return await findProductByrestaurantId(restaurantId);
    }

    findProductById = async(productId: number) => {
        const product = await findProductById(productId);
        if(!product) {
            throw ProductNotFoundError;
        }
        return product;
    }

    createProduct = async(data: CreateProductDTO, restaurantId: number, userId: number, userRole: SystemRole) => {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }

        if(userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
                    throw UnAuthorisedError;
        };

        let categoryId: number | null = null;
        if (data.categoryName) {
            let category = await findCategoryByName(restaurantId, data.categoryName);
            if (!category) {
                category = await createCategory(restaurantId, data.categoryName);
            }
            categoryId = category.id;
        }

        return await createProduct({
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
            restaurantId,
            categoryId,
        });
    }

    update = async (productId: number, userId: number, userRole: SystemRole, data: UpdateProductDTO, branchId?: number) => {
        const product = await findProductById(productId);
        if (!product) {
            throw ProductNotFoundError;
        }

        const restaurant = await findRestaurantById(product.restaurantId);
        if (!restaurant) throw RestaurantNotFoundError;
        if (userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
            throw UnAuthorisedError;
        }

        let categoryId: number | undefined = undefined;
        if (data.categoryName) {
            let category = await findCategoryByName(product.restaurantId, data.categoryName);
            if (!category) {
                category = await createCategory(product.restaurantId, data.categoryName);
            }
            categoryId = category.id;
        }

        const updatedProduct = await updateProduct(productId, {
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
            categoryId,
        });

        let branchDetails;
        if (branchId && (data.price !== undefined || data.stock !== undefined || data.isAvailable !== undefined)) {
            const trx = await db.transaction();
            try {
                const entity = await updateBranchDetails(branchId, productId, {
                    price: data.price,
                    stock: data.stock,
                    isAvailable: data.isAvailable,
                }, trx);
                if (data.price !== undefined) {
                    await insertOutboxEvent(trx, {
                        aggregateType: "product_branch_details",
                        aggregateId: `${branchId}:${productId}`,
                        eventType: EVENT_TYPES.PRODUCT_PRICE_CHANGED,
                        payload: {branchId, productId, newPrice: entity.price},
                    });
                }
                if (data.stock !== undefined || data.isAvailable !== undefined) {
                    await insertOutboxEvent(trx, {
                        aggregateType: "product_branch_details",
                        aggregateId: `${branchId}:${productId}`,
                        eventType: EVENT_TYPES.PRODUCT_STOCK_CHANGED,
                        payload: {
                            branchId,
                            productId,
                            newStock: entity.stock,
                            isAvailable: entity.isAvailable,
                        },
                    });
                }
                await trx.commit();
                branchDetails = entity;
            } catch (err) {
                await trx.rollback();
                throw err;
            }
        }

        return {product: updatedProduct, branchDetails};
    }

    findByBranchAndIds = async (branchId: number, productIds: number[]): Promise<BranchProductRow[]> => {
        if (productIds.length === 0) return [];
        const rows = await db("product_branch_details as pbd")
            .join("products as p", "p.id", "pbd.product_id")
            .where("pbd.branch_id", branchId)
            .whereIn("pbd.product_id", productIds)
            .whereNull("p.deleted_at")
            .select(
                "pbd.product_id",
                "p.name",
                "p.image_url",
                "pbd.price",
                "pbd.stock",
                "pbd.is_available",
            );
        return rows.map((r: any) => ({
            productId: r.product_id,
            name: r.name,
            imageUrl: r.image_url,
            price: r.price,
            stock: r.stock,
            isAvailable: r.is_available,
        }));
    }

    /**
     * Atomically decrements branch stock for each item. Locks the rows FOR UPDATE
     * and emits product.stock.changed per decrement so order-service invalidates
     * its cache.
     */
    reserveStock = async (branchId: number, items: ReserveStockInput[]): Promise<ReserveStockResult> => {
        const sanitized = items
            .map((it) => ({productId: Number(it.productId), quantity: Number(it.quantity)}))
            .filter((it) => Number.isInteger(it.productId) && Number.isInteger(it.quantity) && it.quantity > 0);

        if (sanitized.length !== items.length) {
            throw InvalidReserveItemsError;
        }

        const productIds = sanitized.map((i) => i.productId);

        const trx = await db.transaction();
        try {
            const rows = await trx("product_branch_details")
                .where("branch_id", branchId)
                .whereIn("product_id", productIds)
                .select("product_id", "stock", "is_available")
                .forUpdate();

            const byProduct = new Map<number, {stock: number; isAvailable: boolean}>();
            for (const r of rows) byProduct.set(Number(r.product_id), {stock: r.stock, isAvailable: r.is_available});

            const offending: OutOfStockItem[] = [];
            for (const it of sanitized) {
                const current = byProduct.get(it.productId);
                if (!current || !current.isAvailable) {
                    offending.push({productId: it.productId, requested: it.quantity, available: 0});
                    continue;
                }
                if (current.stock < it.quantity) {
                    offending.push({productId: it.productId, requested: it.quantity, available: current.stock});
                }
            }

            if (offending.length > 0) {
                throw outOfStockError(offending);
            }

            const applied: ReserveStockApplied[] = [];
            for (const it of sanitized) {
                const newStock = byProduct.get(it.productId)!.stock - it.quantity;
                await trx("product_branch_details")
                    .where("branch_id", branchId)
                    .where("product_id", it.productId)
                    .update({stock: newStock});
                applied.push({productId: it.productId, newStock});
            }

            for (const a of applied) {
                await insertOutboxEvent(trx, {
                    aggregateType: "product_branch_details",
                    aggregateId: `${branchId}:${a.productId}`,
                    eventType: EVENT_TYPES.PRODUCT_STOCK_CHANGED,
                    payload: {branchId, productId: a.productId, newStock: a.newStock},
                });
            }

            await trx.commit();
            return {ok: true, applied};
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }

     /**
     * Atomically increments branch stock for each item — reverse of reserveStock.
     * Used by order-service when an order placement fails after stock was reserved.
     * Bulk-updates via a single VALUES table and bulk-inserts the outbox rows.
     */
    releaseStock = async (branchId: number, items: ReserveStockInput[]): Promise<ReserveStockResult> => {
        const sanitized = sanitizeStockItems(items);
        const productIds = sanitized.map((i) => i.productId);

        const trx = await db.transaction();
        try {
            // Lock + read current stock for the targeted rows in one round-trip.
            const rows = await trx("product_branch_details")
                .where("branch_id", branchId)
                .whereIn("product_id", productIds)
                .select("product_id", "stock")
                .forUpdate();

            const byProduct = new Map<number, number>();
            for (const r of rows) byProduct.set(Number(r.product_id), Number(r.stock));

            // Compute the new stock per item; skip unknown products (release is best-effort).
            const applied: ReserveStockApplied[] = [];
            for (const it of sanitized) {
                const current = byProduct.get(it.productId);
                if (current === undefined) continue;
                applied.push({productId: it.productId, newStock: current + it.quantity});
            }

            if (applied.length > 0) {
                await bulkUpdateStock(trx, branchId, applied);
                await insertOutboxEvents(trx, applied.map((a) => ({
                    aggregateType: "product_branch_details",
                    aggregateId: `${branchId}:${a.productId}`,
                    eventType: EVENT_TYPES.PRODUCT_STOCK_CHANGED,
                    payload: {branchId, productId: a.productId, newStock: a.newStock},
                })));
            }

            await trx.commit();
            return {ok: true, applied};
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }
}


function sanitizeStockItems(items: ReserveStockInput[]): ReserveStockInput[] {
    const sanitized = items
        .map((it) => ({productId: Number(it.productId), quantity: Number(it.quantity)}))
        .filter((it) => Number.isInteger(it.productId) && Number.isInteger(it.quantity) && it.quantity > 0);
    if (sanitized.length !== items.length) {
        throw InvalidReserveItemsError;
    }
    return sanitized;
}

/**
 * Single UPDATE that sets product_branch_details.stock from a derived VALUES
 * table — one row, regardless of how many items.
 *
 *   UPDATE product_branch_details AS pbd
 *   SET stock = v.new_stock
 *   FROM (VALUES (1, 5), (2, 7)) AS v(product_id, new_stock)
 *   WHERE pbd.branch_id = ? AND pbd.product_id = v.product_id;
 */
async function bulkUpdateStock(trx: Knex.Transaction, branchId: number, applied: ReserveStockApplied[]): Promise<void> {
    if (applied.length === 0) return;

    const placeholders = applied.map(() => "(?, ?)").join(",");
    const bindings: (number | string)[] = [];
    for (const a of applied) bindings.push(a.productId, a.newStock);
    bindings.push(branchId);
    // Casts are required: parameters inside VALUES default to `text`, which
    // breaks `pbd.product_id (bigint) = v.product_id` and `SET stock (int) = v.new_stock`.
    await trx.raw(
        `UPDATE product_branch_details AS pbd
         SET stock = v.new_stock::int
         FROM (VALUES ${placeholders}) AS v(product_id, new_stock)
         WHERE pbd.branch_id = ? AND pbd.product_id = v.product_id::bigint`,
        bindings,
    );
}
