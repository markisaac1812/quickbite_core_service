import { validateBody } from '../../../common/validation/validate';
import { ForgotPasswordDTO, LoginDTO, RegisterDTO } from '../dto/auth.dto';
import {AuthService,authService} from '../service/auth.service';
import {Request, Response, NextFunction} from 'express';

export class AuthController {
    constructor(private readonly authService: AuthService) {}

    register = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            //1validate request using DTO
            const data = await validateBody(RegisterDTO, req.body);
            //2 call register form service
            const result = await this.authService.register(data);
            //3 return response
            res.status(201).json(result);
        }
        catch(err){
            next(err)
        }
    }

    login = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            //1validate request using DTO
            const data = await validateBody(LoginDTO, req.body);
            //2 call login form service
            const result = await this.authService.login(data);
            //3 return response
            res.status(200).json(result);
        }
        catch(err){
            next(err)
        }
    }

    forgetPassword = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            //1validate request using DTO
            const data = await validateBody(ForgotPasswordDTO, req.body);
            //2 call forget password form service
            await this.authService.forgetPassword(data);
            //3 return response
            res.status(200).json({message: 'If the email exists, an OTP has been sent.'});
        }
        catch(err){
            next(err)
        }
    };
}

export const authController = new AuthController(authService);