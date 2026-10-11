import { ProductCategory } from "../entity/product-category.entity";
import {db} from "../../../common/knex/knex"

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