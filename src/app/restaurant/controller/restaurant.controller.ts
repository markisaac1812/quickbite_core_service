import {restaurantService, RestaurantService} from "../service/restaurant.service";
import {Request, Response, NextFunction} from 'express';
import {validateBody} from "../../../common/validation/validate";
import {CreateRestaurantDTO, UpdateRestaurantDTO,UpdateRestaurantStatusDTO} from "../dto/restaurant.dto";
import { SystemRole } from "../../user/entity/enums";

export class RestaurantController {
    constructor(private readonly restaurantService: RestaurantService) {}

    getAllRestaurants = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const restaurants = await this.restaurantService.getAllRestaurants();
            return res.status(200).json({data: restaurants});
        } catch (err) {
            next(err);
        }
    }

    getRestaurantById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            const restaurant = await this.restaurantService.getRestaurantById(id);
            return res.status(200).json({data: restaurant});
        } catch (err) {
            next(err);
        }
    };

    createWithOwner = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userRole = req.user?.role! as SystemRole; 
            const data = await validateBody(CreateRestaurantDTO, req.body);
            const result = await this.restaurantService.createWithOwner(userRole, data);
            return res.status(201).json({message: 'Restaurant and owner created successfully', data: result});
        } catch (err) {
            next(err);
        }
    }

    updateRestaurant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            const data = await validateBody(UpdateRestaurantDTO, req.body);
            const updatedRestaurant = await this.restaurantService.updateRestaurant(req.user?.role! as SystemRole,req.user?.userId as Number, id, data);
            return res.status(200).json({message: 'Restaurant updated successfully', data: updatedRestaurant});
        } catch (err) {
            next(err);
        }
    }

    updateRestaurantStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            const data = await validateBody(UpdateRestaurantStatusDTO, req.body);
            const updatedRestaurant = await this.restaurantService.updateRestaurantStatus(req.user?.role! as SystemRole, id, data);
            return res.status(200).json({message: 'Restaurant status updated successfully', data: updatedRestaurant});
        } catch (err) {
            next(err);
        }
    }
}

export const restaurantController = new RestaurantController(restaurantService);