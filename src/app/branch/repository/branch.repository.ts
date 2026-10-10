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
            created_at: branch.createdAt,
            updated_at: branch.updatedAt,
            delivery_radius: branch.deliveryRadius,
            currency: branch.currency,
            commission: branch.commission
        }).returning(BRANCH_COLUMNS);
    return toEntity(row);
}

export async function findNearbyBranches(lat: number, lng: number): Promise<Branch[]> {
    const result = await db.raw(`
       SELECT 
       b.id,
       b.restaurant_id,
       b.address_text,
       b.label,
       b.lat,
       b.lng,
       b.is_active,
       b.accept_orders,
       b.currency,
       r.name,
       r.logo_url
       FROM restaurant_branches b JOIN restaurants r ON  b.restaurant_id = r.id
       WHERE b.is_active = true AND r.status ='active'
       AND ST_DWithin(b.location, ST_MakePoint(?, ?)::geography, b.delivery_radius*1000)
    `,[lng, lat]);

    return result.rows;
}

export async function findBranchByRestaurantId(id: number): Promise<Branch[]> {
    const rows = await db('restaurant_branches')
    .select(BRANCH_COLUMNS)
    .where('restaurant_id', id);
    return rows.map(toEntity);
}

export async function findBranchById(id: number): Promise<Branch | undefined> {
    const row = await db('restaurant_branches')
        .select(BRANCH_COLUMNS)
        .where('id', id)
        .first();
    return row ? toEntity(row) : undefined;
}

export async function updateBranch(id: number, data: Partial<Branch>): Promise<Branch> {
    const [row] = await db('restaurant_branches')
        .update({
            address_text: data.addressText,
            label: data.label,
            lat: data.lat,
            lng: data.lng,
            is_active: data.isActive,
            opens_at: data.opensAt,
            closes_at: data.closesAt,
            accept_orders: data.acceptOrders,
            updated_at: Date.now(),
            delivery_radius: data.deliveryRadius,
            currency: data.currency,
        })
        .where('id', id)
        .returning(BRANCH_COLUMNS);
    return toEntity(row);
}

export async function updateBranchStatus(id: number, data: {isActive?: boolean,commission?: number}): Promise<Branch> {
    const [row] = await db('restaurant_branches')
        .update({
            is_active: data.isActive,
            commission: data.commission,
            updated_at: new Date(),
        })
        .where('id', id)
        .returning(BRANCH_COLUMNS);
    return toEntity(row);
}
