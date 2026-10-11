import { Product } from "../entity/product.entity";
import {db} from "../../../common/knex/knex"

const PRODUCT_COLS = ['id', 'name', 'description', 'image_url', 'restaurant_id', 'category_id', 'created_at', 'updated_at', 'deleted_at'];

function toEntity(row: any):Product {
    return new Product({
        id: row.id,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        restaurantId: row.restaurant_id,
        categoryId: row.category_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at
    });
}

export async function findProductsByBranch(branchId: number) {
    const rows = await db("products as p")
        .join("product_branch_details as pbd", "p.id", "pbd.product_id")
        .leftJoin("product_categories as pc", "p.category_id", "pc.id")
        .where("pbd.branch_id", branchId)
        .whereNull("p.deleted_at")
        .select(
            "p.id",
            "p.name",
            "p.description",
            "p.image_url",
            "p.restaurant_id",
            "p.category_id",
            "pc.name as category_name",
            "pbd.price",
            "pbd.stock",
            "pbd.is_available",
        );
    return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        restaurantId: row.restaurant_id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        price: row.price,
        stock: row.stock,
        isAvailable: row.is_available,
    }));
}

export async function findProductByrestaurantId(restaurantId: number): Promise<Product[]> {
    const rows = await db("products")
        .select(PRODUCT_COLS)
        .where("restaurant_id", restaurantId)
        .whereNull("deleted_at");
    return rows.map(toEntity);
}

export async function findProductById(productId: number): Promise<Product | undefined> {
    const row = await db("products")
        .select(PRODUCT_COLS)
        .where("id", productId)
        .whereNull("deleted_at")
        .first();
    return row ? toEntity(row) : undefined;
}