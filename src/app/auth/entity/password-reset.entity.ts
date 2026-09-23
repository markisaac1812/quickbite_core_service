export class PasswordReset {
    id: number
    userId: number
    otpHahsed: string
    expiresAt: Date
    createdAt: Date
    consumedAt: Date
    
    constructor(data: PasswordReset) {
        this.id = data.id
        this.userId = data.userId
        this.otpHahsed = data.otpHahsed
        this.expiresAt = data.expiresAt
        this.createdAt = data.createdAt
        this.consumedAt = data.consumedAt
    }

    isExpired(): boolean {
        return this.expiresAt < new Date()
    }
}