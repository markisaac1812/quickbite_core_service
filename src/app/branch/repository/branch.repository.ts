import {Knex} from "knex";
import {db} from "../../../lib/knex/knex";
import {Branch} from "../entity/branch.entity";

const BRANCH_COLUMNS = ['id','restaurant_id','country_code','address_text','label','lat','lng',
    'is_active','opens_at','closes_at','accept_orders','created_at','updated_at',
    'delivery_radius','delivery_fee','currency','commission','location'];

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
        deliveryFee: row.delivery_fee,
        currency: row.currency,
        commission: row.commission,
        location: row.location
    });
}

export async function createBranch (data: Partial <Branch>, conn: Knex = db): Promise<Branch> {
    const [row] = await conn("restaurant_branches").insert({
        restaurant_id: data.restaurantId,
        country_code: data.countryCode,
        address_text: data.addressText,
        label: data.label,
        lat: data.lat,
        lng: data.lng,
        is_active: data.isActive,
        opens_at: data.opensAt,
        closes_at: data.closesAt,
        accept_orders: data.acceptOrders,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
        delivery_radius: data.deliveryRadius,
        currency: data.currency,
        commission: data.commission
    }).returning(BRANCH_COLUMNS);

    return toEntity(row);
}

export async function findBranchesByRestaurant(restaurantId: number): Promise<Branch[]> {
    const rows = await db("restaurant_branches").select(BRANCH_COLUMNS).where("restaurant_id", restaurantId);
    return rows.map(toEntity);
}

export async function findBranchById(id: number): Promise<Branch | undefined> {
    const row = await db("restaurant_branches").select(BRANCH_COLUMNS).where("id", id).first();
    return row ? toEntity(row) : undefined;
}

export async function updateBranch(id: number, data: Record<string, any>, conn: Knex = db): Promise<Branch> {
    const [row] = await conn("restaurant_branches").where("id", id).update({
        label: data.label,
        address_text: data.addressText,
        lat: data.lat,
        lng: data.lng,
        opens_at: data.opensAt,
        closes_at: data.closesAt,
        delivery_radius: data.deliveryRadius,
        delivery_fee: data.deliveryFee,
        currency: data.currency,
        accept_orders: data.acceptOrders,
        updated_at: new Date(),
    }).returning(BRANCH_COLUMNS);
    return toEntity(row);
}

export async function updateBranchStatus(id: number, data: {isActive?: boolean, commission?: number}, conn: Knex = db): Promise<Branch> {
    const [row] = await conn("restaurant_branches").where("id", id).update({
        is_active: data.isActive,
        commission: data.commission,
        updated_at: new Date(),
    }).returning(BRANCH_COLUMNS);
    return toEntity(row);
}

export async function findNearbyBranches(lat: number, lng: number) {
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
       r.name AS restaurant_name,
       r.logo_url
       FROM restaurant_branches b JOIN restaurants r ON  b.restaurant_id = r.id
       WHERE b.is_active = true AND r.status ='active'
       AND ST_DWithin(b.location, ST_MakePoint(?, ?)::geography, b.delivery_radius*1000)
    `,[lng, lat]);

    return result.rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        addressText: row.address_text,
        label: row.label,
        lat: row.lat,
        lng: row.lng,
        isActive: row.is_active,
        acceptOrders: row.accept_orders,
        currency: row.currency,
        restaurantName: row.restaurant_name,
        logoUrl: row.logo_url,
    }));
}