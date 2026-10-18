import {Router} from "express";
import {authenticate} from "../../lib/auth/guard";
import { rbac, requireRestaurantMember } from "../../lib/auth/rbac";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { MemberController } from "./controller/member.controller";    

export const rbacRouter = Router();
    
const memberController = container.resolve<MemberController>(TOKENS.MemberController);

rbacRouter.get('/roles/:role/permissions',memberController.getRolePermissions);

rbacRouter.post('/restaurants/:restaurantId/members',
    authenticate,
    requireRestaurantMember('restaurantId'),
    rbac({resource:"core:member",action:"create"}),
    memberController.createMember
);

rbacRouter.get('/restaurants/:restaurantId/members',
    authenticate,
    requireRestaurantMember('restaurantId'),
    rbac({resource:"core:member",action:"read"}),
    memberController.listMembers
);

rbacRouter.patch('/restaurants/:restaurantId/members/:memberId',
    authenticate,
    requireRestaurantMember('restaurantId'),
    rbac({resource:"core:member",action:"update"}),
    memberController.updateMember
);

rbacRouter.delete('/restaurants/:restaurantId/members/:memberId',
    authenticate,
    requireRestaurantMember('restaurantId'),
    rbac({resource:"core:member",action:"delete"}),
    memberController.deleteMember
);

rbacRouter.put('/restaurants/:restaurantId/members/:memberId/branches',
    authenticate,
    requireRestaurantMember('restaurantId'),
    rbac({resource:"core:member",action:"update"}),
    memberController.updateMemberBranches
);
