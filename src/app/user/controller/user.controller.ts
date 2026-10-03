import { UpdateUserDTO } from "../dto/user.dto";
import {UserService,userService} from "../service/user.service";
import {Request, Response, NextFunction} from 'express';
import { validateBody } from "../../../common/validation/validate";

export class UserController{
    constructor(private readonly userService: UserService){}

    getMe = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            const user = await this.userService.getByUserId(req.user?.userId!);
            return res.status(200).json(user);
        }
        catch(err){
            next(err)
        }
    }
    updateMe = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            const data = await validateBody(UpdateUserDTO, req.body);
            const user = await this.userService.updateUser(req.user?.userId!, data);
            return res.status(200).json({
                message: 'User updated successfully',
                user
            });
        }
        catch(err){
            next(err)
        }
    }
}

export const userController = new UserController(userService);