import {Knex} from "knex";
import {db} from "../../../common/knex/knex";
import {Branch} from "../entity/branch.entity";

const BRANCH_COLUMNS = ['id','restaurant_id','country_code','address_text','label','lat','lng',
    'is_active','opens_at','closes_at','accept_orders','created_at','updated_at',
    'delivery_radius','currency','commission',];

function toEntity(row: any) {
    return new Branch({
        id: row.id,
        restaurantId: row.restaurant_id,
        countryCode: row.country_code,
        addressText: row.address_text,
        label: row.label,
        lat: row.lat,
        lng: row.lng,
        isActive: row.is_active,
        opensAt: row.opens_at,
        closesAt: row.closes_at,
        acceptOrders: row.accept_orders,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deliveryRadius: row.delivery_radius,
        currency: row.currency,
        commission: row.commission,
    });
}

export async function createBranch(branch: Partial<Branch>,conn: Knex = db): Promise<Branch> {
    const [row] = await conn('restaurant_branches')
        .insert({
            restaurant_id: branch.restaurantId,
            country_code: branch.countryCode,
            address_text: branch.addressText,
            label: branch.label,
            lat: branch.lat,
            lng: branch.lng,
            is_active: branch.isActive,
            opens_at: branch.opensAt,
            closes_at: branch.closesAt,
            accept_orders: branch.acceptOrders,
            delivery_radius: branch.deliveryRadius,
            currency: branch.currency,
            commission: branch.commission
        }).returning(BRANCH_COLUMNS);
    return toEntity(row);
}

