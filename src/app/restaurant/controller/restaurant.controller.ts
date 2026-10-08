import {restaurantService, RestaurantService} from "../service/restaurant.service";
import {Request, Response, NextFunction} from 'express';

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
}

export const restaurantController = new RestaurantController(restaurantService);