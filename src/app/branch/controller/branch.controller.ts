import {Request,Response,NextFunction} from "express";
import {branchService, BranchService} from "../service/branch.service";
import {CreateBranchDTO, UpdateBranchDTO} from "../dto/branch.dto";
import { validateBody } from "../../../common/validation/validate";
import { SystemRole } from "../../user/entity/enums";


export class BranchController {
    constructor(private readonly branchService: BranchService) {}

   create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const restaurantId = Number(req.params.restaurantId);
            const data = await validateBody(CreateBranchDTO, req.body);
            const branch = await this.branchService.create(restaurantId, Number(req.user?.userId), req.user?.role as SystemRole, data);
            res.status(201).json({
                message: "Branch created successfully",
                data: branch
            });
        } catch (error) {
            next(error);
        }
    }

    findNearby = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);
            const branches = await this.branchService.findNearby(lat, lng);
            res.status(200).json({
                data: branches
            });
        } catch (error) {
            next(error);
        }
    }

    findByRestaurantId = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const restaurantId = Number(req.params.restaurantId);
            const branches = await this.branchService.findByRestaurantId(restaurantId);
            res.status(200).json({
                data: branches
            });
        } catch (error) {
            next(error);
        }
    }

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const branchId = Number(req.params.branchId);
            const data = await validateBody(UpdateBranchDTO, req.body);
            const userId = Number(req.user?.userId);
            const userRole = req.user?.role as SystemRole;
            const updatedBranch = await this.branchService.update(branchId, userId, userRole, data);
            res.status(200).json({
                message: "Branch updated successfully",
                data: updatedBranch
            });
        } catch (error) {
            next(error);
        }
    }
}

export const branchController = new BranchController(branchService);