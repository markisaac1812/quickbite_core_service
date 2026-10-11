export class Product {
    id: number
    name: string
    description: string
    imageUrl: string
    restaurantId: number
    categoryId: number | null
    createdAt: Date
    updatedAt: Date
    deletedAt?: Date

    constructor(data: Partial<Product>) {
        this.id = data.id!
        this.name = data.name!
        this.description = data.description ?? ""
        this.imageUrl = data.imageUrl ?? ""
        this.restaurantId = data.restaurantId!
        this.categoryId = data.categoryId ?? null
        this.createdAt = data.createdAt ?? new Date()
        this.updatedAt = data.updatedAt ?? new Date()
        this.deletedAt = data.deletedAt
    }
}