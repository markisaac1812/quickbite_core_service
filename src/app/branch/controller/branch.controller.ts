import {Request,Response,NextFunction} from "express";
import {BranchService} from "../service/branch.service";
import {CreateBranchDTO, UpdateBranchDTO, UpdateBranchStatusDTO} from "../dto/branch.dto";
import { validateBody } from "../../../lib/validation/validate";
import { SystemRole } from "../../user/entity/enums";
import {injectable,inject} from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens";
import {sendSuccess} from "../../../lib/http/response";
import {BranchNotFoundError} from "../erros";


@injectable()
export class BranchController {
    constructor(@inject(TOKENS.BranchService) private readonly branchService: BranchService) {}

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

    updateStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const branchId = Number(req.params.id);
            const data = await validateBody(UpdateBranchStatusDTO, req.body);
            const userRole = req.user?.role as SystemRole;
            const updatedBranch = await this.branchService.updateStatus(branchId, userRole, data);
            res.status(200).json({
                message: "Branch status updated successfully",
                data: updatedBranch
            });
        } catch (error) {
            next(error);
        }
    }

    findByIdWithRestaurant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            const result = await this.branchService.findByIdWithRestaurant(id);
            if (!result) throw BranchNotFoundError;
            const {branch, restaurantStatus} = result;
            sendSuccess(res, {
                id: branch.id,
                restaurantId: branch.restaurantId,
                restaurantStatus,
                region: branch.countryCode,
                isActive: branch.isActive,
                acceptOrders: branch.acceptOrders,
                deliveryFee: branch.deliveryFee,
                commissionBps: branch.commission,
                currency: branch.currency,
                lat: Number(branch.lat),
                lng: Number(branch.lng),
                name: branch.label,
                addressText: branch.addressText,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Batch lookup for the order-service's `getBranchesByIds`. Caller passes
     * `?ids=1,2,3` (max 100 per call to keep the URL bounded). Missing ids
     * are silently dropped from the response — clients should not assume
     * `response.length === input.length`.
     */
    findByIdsWithRestaurant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const raw = String(req.query.ids ?? "").trim();
            if (!raw) return sendSuccess(res, []);
            const ids = raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
            if (ids.length === 0) return sendSuccess(res, []);
            if (ids.length > 100) return res.status(400).json({error: "ids: max 100 per call"});
            const results = await this.branchService.findByIdsWithRestaurant(ids);
            sendSuccess(res, results.map(toInternalBranchDTO));
        } catch (err) {
            next(err);
        }
    }
}

function toInternalBranchDTO(r: {branch: any; restaurantStatus: string; restaurantOwnerId: number}) {
    const {branch, restaurantStatus, restaurantOwnerId} = r;
    return {
        id: branch.id,
        restaurantId: branch.restaurantId,
        restaurantOwnerId,
        restaurantStatus,
        region: branch.countryCode,
        isActive: branch.isActive,
        acceptOrders: branch.acceptOrders,
        deliveryFee: branch.deliveryFee,
        // restaurant_branches.commission is stored as a 0-100 percent (the
        // UpdateBranchStatusDTO caps it at 100). Convert to basis points here
        // so consumers can use the standard bps math (× / 10000).
        commissionBps: branch.commission * 100,
        currency: branch.currency,
        lat: Number(branch.lat),
        lng: Number(branch.lng),
        name: branch.label,
        addressText: branch.addressText,
    };
}
