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

function toEntity(row: any) {
    return new CustomerAddress({
        id: row.id,
        userId: Number(row.user_id),
        label: row.label,
        country: row.country,
        city: row.city,
        street: row.street,
        building: row.building,
        apartmentNumber: row.apartment_number,
        type: row.type,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.long),
        isDefault: row.is_default,
    });
}

export async function findCustomerAddressByUserId(userId: number): Promise<CustomerAddress[]> {
    const row = await db("customer_addresses").select(
        CUSTOMER_ADDRESS_COLUMNS
    ).where("user_id", userId);
    return row.map(toEntity);
}

export async function findAddressById(addressId: number): Promise<CustomerAddress | undefined> {
    const row = await db("customer_addresses").select(
        CUSTOMER_ADDRESS_COLUMNS
    ).where("id", addressId).first();
    return row ? toEntity(row) : undefined;
}

export async function createAddress(address: Partial<CustomerAddress>): Promise<CustomerAddress> {
    const [row] = await db("customer_addresses").insert({
        user_id: address.userId,
        label: address.label,
        country: address.country,
        city: address.city,
        street: address.street,
        building: address.building,
        apartment_number: address.apartmentNumber,
        type: address.type,
        lat: address.lat,
        long: address.lng,
        is_default: address.isDefault,
    }).returning(CUSTOMER_ADDRESS_COLUMNS);

    return toEntity(row[0]);
}

export async function clearDefaultByUserId(userId: number): Promise<void> {
    await db("customer_addresses")
        .where("user_id", userId)
        .where("is_default", true)
        .update({is_default: false});
}

export async function UpdateAddress(addressId: number, address: Partial<CustomerAddress>): Promise<CustomerAddress> {
    const row = await db("customer_addresses").where("id", addressId).update({
        label: address.label,
        country: address.country,
        city: address.city,
        street: address.street,
        building: address.building,
        apartment_number: address.apartmentNumber,
        type: address.type,
        lat: address.lat,
        long: address.lng,
        is_default: address.isDefault,
    }).returning(CUSTOMER_ADDRESS_COLUMNS);

    return toEntity(row[0]);
}

export async function deleteAddress(addressId: number): Promise<void> {
    await db("customer_addresses").where("id", addressId).del();
}
