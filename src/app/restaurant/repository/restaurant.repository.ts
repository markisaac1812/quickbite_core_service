import { Knex } from "knex";
import {db} from "../../../common/knex/knex"
import {Restaurant} from "../entity/restaurant.entity"

const RESTAURANT_COLUMNS = ['id', 'owner_id', 'name', 'logo_url', 'status', 'primary_country', 'created_at', 'updated_at', 'status_updated_at']

function toEntity(row:any) {
    return new Restaurant({
        id:row.id,
        ownerId: row.owner_id,
        name: row.name,
        logoURL: row.logo_url,
        status: row.status,
        primaryCountry: row.primary_country,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        statusUpdatedAt: row.status_updated_at
    });
}

export async function findAllRestaurants(): Promise<Restaurant[]> {
    // pagination and filtering will be later
    const rows = await db("restaurants").select(RESTAURANT_COLUMNS);
    return rows.map(toEntity);
}

export async function findRestaurantById(id: number): Promise<Restaurant> {
    const row = await db("restaurants").select(RESTAURANT_COLUMNS).where("id", id).first();
    return toEntity(row);
}

export async function createRestaurant(restaurant: Partial<Restaurant>,conn:Knex = db): Promise<Restaurant> {
    const [row] = await conn("restaurants").insert({
        owner_id: restaurant.ownerId,
        name: restaurant.name,
        logo_url: restaurant.logoURL,
        status: restaurant.status,
        primary_country: restaurant.primaryCountry,
        created_at: restaurant.createdAt,
        updated_at: restaurant.updatedAt,
        status_updated_at: restaurant.statusUpdatedAt
    }).returning(RESTAURANT_COLUMNS);
    return toEntity(row);
}

export async function updateRestaurant(id: number, data: Partial<Restaurant>): Promise<Restaurant> {
    const [row] = await db("restaurants").update({
        name: data.name,
        logo_url: data.logoURL,
        primary_country: data.primaryCountry,
        updated_at: data.updatedAt,
    }).where("id", id).returning(RESTAURANT_COLUMNS);
    return toEntity(row);
}

export async function updateRestaurantStatus(id: number, status: string){
    const [row] = await db("restaurants").update({
        status: status,
        status_updated_at: new Date(),
    }).where("id", id).returning(['id', 'status']);
    return toEntity(row);
} 