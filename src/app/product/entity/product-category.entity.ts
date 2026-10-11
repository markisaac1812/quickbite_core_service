export class ProductCategory {
    id: number
    restaurantId: number
    name: string
    createdAt: Date
    updatedAt: Date

    constructor(data: Partial<ProductCategory>) {
        this.id = data.id!
        this.restaurantId = data.restaurantId!
        this.name = data.name!
        this.createdAt = data.createdAt ?? new Date()
        this.updatedAt = data.updatedAt ?? new Date()
    }
}