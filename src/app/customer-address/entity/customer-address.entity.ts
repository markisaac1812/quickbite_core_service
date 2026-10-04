import { AddressType } from './enums'

export class CustomerAddress {
    id: number
    userId: number
    label: string
    country: string | null
    city: string
    street: string
    building: string | null
    apartment_number: string | null
    type: AddressType
    lat: number
    long: number
    is_default: boolean


    constructor(data: Partial<CustomerAddress>) {
        this.id = data.id!
        this.userId = data.userId!
        this.label = data.label!
        this.country = data.country!
        this.city = data.city!
        this.street = data.street!
        this.building = data.building!
        this.apartment_number = data.apartment_number!
        this.type = data.type!
        this.lat = data.lat!
        this.long = data.long!
        this.is_default = data.is_default!
    }
}