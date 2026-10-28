import {MemberBranch} from "../entity/member-branch.entity";
import { db } from "../../../lib/knex/knex";
import { Knex } from "knex";

function toEntity(row: any): MemberBranch {
    return new MemberBranch({
        memberId: row.member_id,
        branchId: row.branch_id,
        createdAt: row.created_at,
    });
}

export async function setMemberBranches(memberId: number, rows: MemberBranch[], trx?: Knex.Transaction) {
    // delete
    const query = trx || db
    await query("member_branches").where('member_id', memberId).delete();
    // insert
    if(rows.length > 0) {
        await query("member_branches").insert(
            rows.map(row => ({
                member_id: row.memberId,
                branch_id: row.branchId,
                created_at: row.createdAt
            }))
        );
    }
}

export async function findBranchIdsByMemberId(memberId: number): Promise<number[]> {
    const rows = await db("member_branches").select("branch_id").where("member_id", memberId);
    return rows?.map(row => Number(row.branch_id)); // [{branch_id:"2"}, {branch_id:"3"}] -> [2,3] (pg returns bigint as string)
}

export async function countBranchesByIdsAndRestaurant(branchIds: number[], restaurantId: number): Promise<number> {
    const [{count}] = await db("restaurant_branches")
        .whereIn("id", branchIds)
        .andWhere("restaurant_id", restaurantId)
        .count("id as count");
    return Number(count);
}


