import {Request,Response,NextFunction} from "express";
import {branchService, BranchService} from "../service/branch.service";
import {CreateBranchDTO} from "../dto/branch.dto";
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
}

export const branchController = new BranchController(branchService);