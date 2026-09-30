export class PasswordReset {
    id: number
    userId: number
    otpHashed: string
    expiresAt: Date
    createdAt: Date
    consumedAt: Date | null
    
    constructor(data: Partial<PasswordReset>) {
        this.id = data.id!
        this.userId = data.userId!
        this.otpHashed = data.otpHashed!
        this.expiresAt = data.expiresAt!
        this.createdAt = data.createdAt!
        this.consumedAt = data.consumedAt ?? null
    }

    isExpired(): boolean {
        return this.expiresAt < new Date()
    }
}