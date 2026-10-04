import { createAddress, findCustomerAddressByUserId,clearDefaultByUserId } from "../repository/customer-address.repo";
import { CreateAddressDTO } from "../dto/customer-address.dto";

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

    createUserAddress = async(userId: number, data: CreateAddressDTO) => {
        if(data.isDefault) {
            await clearDefaultByUserId(userId);
        }
        const address = await createAddress({
            userId,
            label: data.label,
            country: data.country,
            city: data.city,
            street: data.street,
            building: data.building,
            apartmentNumber: data.apartmentNumber,
            type: data.type,
            lat: data.lat,
            lng: data.lng,
            isDefault: data.isDefault,
        });
        return toResponse(address);
    }
}    

export const customerAddressService = new CustomerAddressService();