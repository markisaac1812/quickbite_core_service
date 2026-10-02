import { UserNotFoundError } from "../errors";
import {findUserByID} from "../repository/user.repo";

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
}

export const userService = new UserService();