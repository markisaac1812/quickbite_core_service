import { findCustomerAddressByUserId } from "../repository/customer-address.repo";

  function toResponse(address: any) {
    return {
        id: address.id,
        label: address.label,
        country: address.country,
        city: address.city,
        street: address.street,
        building: address.building,
        apartmentNumber: address.apartmentNumber,
        type: address.type,
        lat: address.lat,
        lng: address.lng,
        isDefault: address.isDefault,
    };
}

export class CustomerAddressService {

    getUserById = async(userId: number) => {
        const addresses = await findCustomerAddressByUserId(userId);
        return addresses.map(toResponse);
    }

}

export const customerAddressService = new CustomerAddressService();