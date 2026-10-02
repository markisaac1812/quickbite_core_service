import { validateBody } from '../../../common/validation/validate';
import { ForgotPasswordDTO, LoginDTO, RegisterDTO, ResetPasswordDTO } from '../dto/auth.dto';
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

            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000, // 15 minutes
            });
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/api/auth/refresh-token', // Set the path for the refresh token cookie
            });
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

            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000, // 15 minutes
            });
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/api/auth/refresh-token', // Set the path for the refresh token cookie
            });
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

    resetPassword = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            //1validate request using DTO
            const data = await validateBody(ResetPasswordDTO, req.body);
            //2 call reset password form service
            await this.authService.resetPassword(data);
            //3 return response
            res.status(200).json({message: 'Password reset successfully.'});
        }
        catch(err){
            next(err)
        }
    };

}

export const authController = new AuthController(authService);