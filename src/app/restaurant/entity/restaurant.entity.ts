import { RestaurantStatus } from "./enums"

export class Restaurant {
    id: number
    ownerId: number
    name: string
    logoURL: string
    status: RestaurantStatus
    primaryCountry: string
    createdAt: Date
    updatedAt: Date
    statusUpdatedAt: Date | null

    constructor(data: Partial<Restaurant>) {
        this.id = data.id!
        this.ownerId = data.ownerId!
        this.name = data.name!
        this.logoURL = data.logoURL ?? ""
        this.status = data.status!
        this.primaryCountry = data.primaryCountry!
        this.createdAt = data.createdAt ?? new Date()
        this.updatedAt = data.updatedAt ?? new Date()
        this.statusUpdatedAt = data.statusUpdatedAt ?? new Date()
    }
}