import {UserService,userService} from "../service/user.service";
import {Request, Response, NextFunction} from 'express';

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
}

export const userController = new UserController(userService);