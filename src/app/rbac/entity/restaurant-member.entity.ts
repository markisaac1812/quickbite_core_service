import {MemberStatus} from "./enums";

export class RestaurantMember{
    id: number;
    restaurantId: number;
    userId: number;
    roleId: number;
    status: MemberStatus;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<RestaurantMember>) {
        this.id = data.id!;
        this.restaurantId = data.restaurantId!;
        this.userId = data.userId!;
        this.roleId = data.roleId!;
        this.status = data.status ?? MemberStatus.ACTIVE;
        this.createdAt = data.createdAt ?? new Date();
        this.updatedAt = data.updatedAt ?? new Date();
    }
}
// Admin will create a member with email and other data.
// an email will be sent to the member with accept invite link and OTP
// accept invite with otp, password