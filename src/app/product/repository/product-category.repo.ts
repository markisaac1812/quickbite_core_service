import { ProductCategory } from "../entity/product-category.entity";
import {db} from "../../../common/knex/knex"
import { Knex } from "knex";

const PRODUCT_CATEGORY_COLS = ['id', 'restaurant_id', 'name', 'created_at', 'updated_at'];

function toEntity(row: any) {
    return new ProductCategory({
        id: row.id,
        restaurantId: row.restaurant_id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    });
}

export async function findCategoriesByRestaurantId(restaurantId: number): Promise<ProductCategory[]> {
    const rows = await db('product_categories').select(PRODUCT_CATEGORY_COLS).where('restaurant_id', restaurantId);
    return rows.map(toEntity);
}

export async function findCategoryByName(restaurantId: number, name: string): Promise<ProductCategory | undefined> {
    const row = await db("product_categories")
        .select(PRODUCT_CATEGORY_COLS)
        .where("restaurant_id", restaurantId)
        .where("name", name)
        .first();
    return row ? toEntity(row) : undefined;
}

export async function createCategory(restaurantId: number, name: string, conn: Knex = db): Promise<ProductCategory> {
    const [row] = await conn("product_categories").insert({
        restaurant_id: restaurantId,
        name,
    }).returning(PRODUCT_CATEGORY_COLS);
    return toEntity(row);
}