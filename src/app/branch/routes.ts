import {Router} from "express";
import { authenticate } from "../../lib/auth/guard";
import { rbac, requireRestaurantMember,requireBranchAccess, } from "../../lib/auth/rbac";
import {TOKENS} from "../../lib/di/tokens";
import {container} from "../../lib/di/container";
import { BranchController } from "./controller/branch.controller";

export const branchRouter = Router();

const branchController = container.resolve<BranchController>(TOKENS.BranchController);

branchRouter.post("/restaurants/:restaurantId/branches",authenticate,requireRestaurantMember('restaurantId'),rbac({resource:"core:branch", action:"create"}), branchController.create);
branchRouter.get("/branches/nearby", branchController.findNearby);
branchRouter.get("/restaurants/:restaurantId/branches", branchController.findByRestaurantId);
branchRouter.patch("/branches/:branchId",authenticate,requireBranchAccess('branchId'),rbac({resource:"core:branch", action:"update"}), branchController.update);
branchRouter.patch("/branches/:id/status",authenticate, branchController.updateStatus);