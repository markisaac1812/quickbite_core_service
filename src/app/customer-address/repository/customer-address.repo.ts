import {db} from "../../../common/knex/knex"
import {CustomerAddress} from "../entity/customer-address.entity"

const CUSTOMER_ADDRESS_COLUMNS = [
    "id",
    "user_id",
    "label",
    "country",
    "city",
    "street",
    "building",
    "apartment_number",
    "type",
    "lat",
    "long",
    "is_default",
]

function toEntity(row:any) {
    return new CustomerAddress({
        id: row.id,
        userId: row.user_id,
        label: row.label,
        country: row.country,
        city: row.city,
        street: row.street,
        building: row.building,
        apartment_number: row.apartment_number,
        type: row.type,
        lat: row.lat,
        long: row.long,
        is_default: row.is_default
    })
}

export async function findCustomerAddressByUserId(userId: number): Promise<CustomerAddress[]> {
    const row = await db("customer_addresses").select(
        CUSTOMER_ADDRESS_COLUMNS
    ).where("user_id", userId);
    return row.map(toEntity);
}

