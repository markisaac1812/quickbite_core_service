import {Router} from "express";
import {container} from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { AuthController } from "./controller/auth.controller";
import { idempotency } from "../../lib/idempotency/idempotency";

export const authRouter = Router();

const authController = container.resolve<AuthController>(TOKENS.AuthController);

authRouter.post('/register',authController.register)
authRouter.post('/login',authController.login)
authRouter.post('/forget-password', idempotency({ strict: true }),authController.forgetPassword)
authRouter.post('/reset-password',authController.resetPassword)
authRouter.post('/refresh', authController.refreshToken)
authRouter.post('/accept-invite', authController.acceptInvite)
