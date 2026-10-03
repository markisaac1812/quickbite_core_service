import { convertMinutesToMilliseconds,convertDaysToMilliseconds } from '../../../common/time/time.converter';
import { validateBody } from '../../../common/validation/validate';
import { ForgotPasswordDTO, LoginDTO, RegisterDTO, ResetPasswordDTO } from '../dto/auth.dto';
import { InvalidRefreshTokenError } from '../errors';
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

            res.cookie("access_token", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: convertMinutesToMilliseconds(15), // 15 minutes
            });
            res.cookie("refresh_token", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: convertDaysToMilliseconds(7), // 7 days
                path: '/api/auth/refresh',
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

            res.cookie("access_token", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: convertMinutesToMilliseconds(15), // 15 minutes
            });
            res.cookie("refresh_token", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: convertDaysToMilliseconds(7), // 7 days
                path: '/api/auth/refresh',
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

    refreshToken = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            //1 get refresh token from cookie
            const refreshToken = req.cookies.refresh_token;
            if(!refreshToken) {
                throw InvalidRefreshTokenError;
            }

            //2 call refresh token form service
            const result = await this.authService.refreshToken(refreshToken);

            //3 set new access token in cookie
            res.cookie("access_token", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: convertMinutesToMilliseconds(15), // 15 minutes
            });

            //4 return response
            res.status(200).json({ message: 'success' });
        }
        catch(err){
            next(err)
        }
    };

}

export const authController = new AuthController(authService);