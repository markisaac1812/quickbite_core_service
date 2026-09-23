import {SystemRole} from "../../user/entity/enums";
import {findUserByEmail, findUserExistsByEmailOrPhone, createUser} from "../../user/repository/user.repo";
import {RegisterDTO} from "../dto/auth.dto";
import {UserAlreadyExistsError, CannotSignupAsSystemAdmin} from "../errors";
import {hashPassword, createAccessToken, createRefreshToken} from "../utils";

export class AuthService {
    register = async(data: RegisterDTO )=> {
        if (data.role == SystemRole.SYSTEM_ADMIN) {
            throw CannotSignupAsSystemAdmin
        }
        // 1. check if user exists by email
        const existing = await findUserExistsByEmailOrPhone(data.email, data.phone);

        // 2. if exists we throw an error
        if(existing) {
            throw UserAlreadyExistsError
        }
        // 3. hashPassword
        const hashedPassword = await hashPassword(data.password);

        // 4. create user
        const now = new Date();
        const user = await createUser({
            email: data.email,
            phone: data.phone,
            name: data.name,
            passwordHash: hashedPassword,
            systemRole: data.role,
            createdAt: now,
            updatedAt: now,
        })

        // 5. create access token , refresh token
        const payload = {userId: user.id, role: data.role, email: user.email};
        const accessToken = createAccessToken(payload);
        const refreshToken = createRefreshToken(payload);

        // 6. return tokens and user data
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                systemRole: user.systemRole,
            }
        }
    }
}

export const authService = new AuthService();