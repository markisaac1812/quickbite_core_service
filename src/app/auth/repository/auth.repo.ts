import {PasswordReset} from "../entity/password-reset.entity"
import {db} from "../../../common/knex/knex"

const PASSWORD_RESET_COLS = ['id', 'user_id', 'otp_hashed', 'expires_at', 'created_at', 'consumed_at']

function toEntity(row:any) {
    return new PasswordReset({
        id: row.id,
        userId: row.user_id,
        otpHashed: row.otp_hashed,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        consumedAt: row.consumed_at
    });
}

export async function createPasswordReset(passwordReset: Partial<PasswordReset>){
    await db("password_resets").insert({
        user_id: passwordReset.userId,
        otp_hashed: passwordReset.otpHashed,
        expires_at: passwordReset.expiresAt,
        created_at: passwordReset.createdAt
    })
}