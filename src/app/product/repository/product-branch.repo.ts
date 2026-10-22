import {db} from "../../../lib/knex/knex";
import {ProductBranchDetails} from "../entity/product-branch.entity";
import type {Knex} from "knex";

const PBD_COLUMNS = ['id', 'branch_id', 'product_id', 'price', 'stock', 'is_available'];

function toEntity(row: any): ProductBranchDetails {
    return new ProductBranchDetails({
        id: row.id,
        branchId: row.branch_id,
        productId: row.product_id,
        price: row.price,
        stock: row.stock,
        isAvailable: row.is_available,
    });
}

export async function updateBranchDetails(
    branchId: number,
    productId: number,
    data: {price?: number; stock?: number; isAvailable?: boolean},
    conn: Knex = db,
): Promise<ProductBranchDetails> {
    const [row] = await conn("product_branch_details")
        .where("branch_id", branchId)
        .where("product_id", productId)
        .update({
            price: data.price,
            stock: data.stock,
            is_available: data.isAvailable,
        })
        .returning(PBD_COLUMNS);
    return toEntity(row);
}
