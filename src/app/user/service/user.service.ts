import { UserNotFoundError } from "../errors";
import {findUserByID, updateUser,} from "../repository/user.repo";
import {UpdateUserDTO} from "../dto/user.dto";

export class UserService{
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