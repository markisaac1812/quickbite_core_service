import {Router} from "express";
import {authenticate} from "../../common/auth/guard";
import {memberController} from "./controller/member.controller";

export const rbacRouter = Router();

rbacRouter.post('/restaurants/:restaurantId/members',
    authenticate,
    memberController.createMember
);