import { validateBody } from '../../../lib/validation/validate';
import { ForgotPasswordDTO, LoginDTO, RegisterDTO, ResetPasswordDTO } from '../dto/auth.dto';
import {AuthService} from '../service/auth.service';
import {Request, Response, NextFunction} from 'express';
import {setAuthCookies} from '../../../lib/utils/cookies';
import {env} from '../../../lib/config/env';
import {toMs} from '../../../pkg/utils/time';
import {inject, injectable} from "tsyringe";
import {TOKENS} from "../../../lib/di/tokens";
import {sendSuccess} from "../../../lib/http/response";

@injectable()
export class AuthController {
    constructor(@inject(TOKENS.AuthService)private readonly authService: AuthService) {}

    register = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            //1validate request using DTO
            const data = await validateBody(RegisterDTO, req.body);
            //2 call register form service
            const result = await this.authService.register(data);
            setAuthCookies(res, result.accessToken, result.refreshToken);
            //3 return response
            sendSuccess(res, result, 201);
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
            setAuthCookies(res, result.accessToken, result.refreshToken);
            //3 return response
            sendSuccess(res, result, 200);
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
            sendSuccess(res, {message: 'If the email exists, an OTP has been sent.'}, 200);
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
            sendSuccess(res, {message: 'Password reset successfully. Please login again.'}, 200);
        }
        catch(err){
            next(err)
        }
    };

    refreshToken = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            const result = await this.authService.refreshToken(req.cookies.refresh_token);
            res.cookie("access_token", result.accessToken, {
                httpOnly: true,
                secure: env.isProduction,
                maxAge: toMs(1, 'h'),
            });
            //3 return response
            sendSuccess(res, {message: 'Token refreshed successfully.'}, 200);
        }
        catch(err){
            next(err)
        }
    };

    acceptInvite = async(req: Request, res: Response, next: NextFunction) => {
        try{
            const data = await validateBody(ResetPasswordDTO, req.body);
            await this.authService.acceptInvite(data);
            sendSuccess(res, {message: 'Invitation accepted successfully, please login again'}, 200);
        }
        catch(err) {
            next(err);
        }
    }

}

