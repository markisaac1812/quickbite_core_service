import {Router} from "express";
import { userController } from "./controller/user.controller";
import { authenticate } from "../../common/auth/guard";

export const userRouter = Router();
userRouter.get('/me',authenticate, userController.getMe);
userRouter.patch('/me',authenticate, userController.updateMe);