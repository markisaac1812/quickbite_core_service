import {Router} from "express";
import { authenticate } from "../../lib/auth/guard";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { UserController } from "./controller/user.controller";

export const userRouter = Router();

const userController = container.resolve<UserController>(TOKENS.UserController);

userRouter.get('/me',authenticate, userController.getMe);
userRouter.patch('/me',authenticate, userController.updateMe);