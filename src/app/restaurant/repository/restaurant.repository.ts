import {db} from "../../../common/knex/knex"
import {Restaurant} from "../entity/restaurant.entity"

const RESTAURANT_COLUMNS = ['id', 'owner_id', 'name', 'logo_url', 'status', 'primary_country', 'created_at', 'updated_at', 'status_updated_at']

function toEntity(row:any) {
    return new Restaurant({
        id:row.id,
        ownerId: row.owner_id,
        name: row.name,
        logoUrl: row.logo_url,
        status: row.status,
        primaryCountry: row.primary_country,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        statusUpdatedAt: row.status_updated_at
    });
}