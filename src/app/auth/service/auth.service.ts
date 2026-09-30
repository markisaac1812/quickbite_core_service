import {SystemRole} from "../../user/entity/enums";
import {findUserExistsByEmailOrPhone, createUser, findUserByEmail} from "../../user/repository/user.repo";
import {LoginDTO, RegisterDTO} from "../dto/auth.dto";
import {UserAlreadyExistsError, CannotSignupAsSystemAdmin,InvalidCredentialsError} from "../errors";
import {hashPassword, createAccessToken, createRefreshToken,comparePassword} from "../utils";

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
            message: 'User registered successfully',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                systemRole: user.systemRole,
                createdAt: user.createdAt,
            }
        }
    }

    login = async(data: LoginDTO) => {
        // 1. check if user exists by email
        const existing = await findUserByEmail(data.email);
        if(!existing) {
            throw InvalidCredentialsError;
        }

        // 2. check if password is correct
        const isMatch = await comparePassword(data.password, existing.passwordHash);
        if(!isMatch) {
            throw InvalidCredentialsError;
        }

        // 3. create access token , refresh token
        const payload = {userId: existing.id, role: existing.systemRole, email: existing.email};
        const accessToken = createAccessToken(payload);
        const refreshToken = createRefreshToken(payload);

        // 4. return tokens and user data
        return {
            message: 'User logged in successfully',
            accessToken,
            refreshToken,
            user: {
                id: existing.id,
                email: existing.email,
                phone: existing.phone,
                systemRole: existing.systemRole,
                createdAt: existing.createdAt,
            }
        }
    }

}

export const authService = new AuthService();