import {MediaStatus} from "./enums";

export class Media {
    id: number
    restaurantId: number
    uploadedBy: number
    status: MediaStatus
    key: string
    url: string
    mimeType: string
    sizeBytes: number
    createdAt: Date

    constructor(data: Partial<Media>) {
        this.id = data.id!
        this.restaurantId = data.restaurantId!
        this.uploadedBy = data.uploadedBy!
        this.status = data.status ?? MediaStatus.PENDING
        this.key = data.key!
        this.url = data.url!
        this.mimeType = data.mimeType!
        this.sizeBytes = data.sizeBytes!
        this.createdAt = data.createdAt ?? new Date()
    }
}
