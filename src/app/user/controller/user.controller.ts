import { UpdateUserDTO } from "../dto/user.dto";
import {UserService} from "../service/user.service";
import {Request, Response, NextFunction} from 'express';
import { validateBody } from "../../../lib/validation/validate";
import {injectable,inject} from "tsyringe";
import {TOKENS} from "../../../lib/di/tokens";
import { sendSuccess } from "../../../lib/http/response";

@injectable()
export class UserController{
    constructor(@inject(TOKENS.UserService) private readonly userService: UserService){}

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


    getAgentById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const agent = await this.userService.getAgentById(Number(req.params.id));
            sendSuccess(res, agent);
        } catch (err) {
            next(err);
        }
    }
}
