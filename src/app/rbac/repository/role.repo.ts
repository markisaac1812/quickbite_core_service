import { Knex } from "knex";
import { db } from "../../../common/knex/knex";
import { Role } from "../entity/role.enitity";

const ROLE_COLUMNS = ['id', 'name', 'display_name', 'created_at', 'updated_at'];

function toEntity(row: any): Role {
    return new Role({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    });
}

export async function findRoleByName(
    name: string,
    trx?: Knex.Transaction
): Promise<number | null> {
    const query = trx || db;
    const row = await query("roles")
        .select('id')
        .where("name", name)
        .first();

    if (!row) return null;

    return row.id;
}