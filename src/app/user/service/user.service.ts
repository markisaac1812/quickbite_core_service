import { UserNotFoundError } from "../errors";
import {findUserByID, findUserByEmail, findUserExistsByEmailOrPhone, updateUser,createUser} from "../repository/user.repo";
import {UpdateUserDTO} from "../dto/user.dto";
import {SystemRole} from "../entity/enums";
import { Knex } from "knex";
import {User} from "../entity/user.entity";
import { UserAlreadyExistsError } from "../../auth/errors";
import { hashPassword } from "../../auth/utils";
export interface CreateUserData {
    email: string;
    phone: string;
    name: string;
    password: string;
    systemRole: SystemRole;
}

export class UserService{
    findByEmail = async (email: string): Promise<User | undefined> => {
        return findUserByEmail(email);
    }

    create = async (data: CreateUserData, trx?: Knex | Knex.Transaction): Promise<User> => {
        // Check if user already exists
        const existing = await findUserExistsByEmailOrPhone(data.email, data.phone);
        if (existing) {
            throw UserAlreadyExistsError;
        }
        const hashedPassword = data.password ? await hashPassword(data.password) : '';
        const now = new Date();
        return createUser({
            email: data.email,
            phone: data.phone,
            name: data.name,
            passwordHash: hashedPassword,
            systemRole: data.systemRole,
            createdAt: now,
            updatedAt: now,
        }, trx);
    }

    getByUserId = async(userId: number) => {
        const user = await findUserByID(userId);
        if(!user) {
            throw UserNotFoundError;
        }
        return {
            id:user.id,
            email:user.email,
            phone:user.phone,
            name:user.name,
            systemRole:user.systemRole,
        };
    }

    updateUser = async(userId:number,data: UpdateUserDTO) => {
        const user = await findUserByID(userId);
        if(!user) {
            throw UserNotFoundError;
        }
        const updated= await updateUser(userId, data);
        return {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            phone: updated.phone,
            systemRole: updated.systemRole,
        };
    }
}

export const userService = new UserService();