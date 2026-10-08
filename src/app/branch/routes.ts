import {Router} from "express";
import { branchController } from "./controller/branch.controller";
import { authenticate } from "../../common/auth/guard";

export const branchRouter = Router();

branchRouter.post("/restaurants/:restaurantId",authenticate, branchController.create);
branchRouter.get("/branches/nearby", branchController.findNearby);