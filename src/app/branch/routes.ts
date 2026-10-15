import {Router} from "express";
import { branchController } from "./controller/branch.controller";
import { authenticate } from "../../common/auth/guard";
import { rbac, requireRestaurantMember,requireBranchAccess, } from "../../common/auth/rbac";

export const branchRouter = Router();

branchRouter.post("/restaurants/:restaurantId/branches",authenticate,requireRestaurantMember('restaurantId'),rbac({resource:"core:branch", action:"create"}), branchController.create);
branchRouter.get("/branches/nearby", branchController.findNearby);
branchRouter.get("/restaurants/:restaurantId/branches", branchController.findByRestaurantId);
branchRouter.patch("/branches/:branchId",authenticate,requireBranchAccess('branchId'),rbac({resource:"core:branch", action:"update"}), branchController.update);
branchRouter.patch("/branches/:id/status",authenticate, branchController.updateStatus);