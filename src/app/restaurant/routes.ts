import {Router} from "express";
import { restaurantController } from "./controller/restaurant.controller";
import { authenticate } from "../../common/auth/guard";

export const restaurantRouter = Router();

restaurantRouter.get('/',restaurantController.getAllRestaurants);
restaurantRouter.get('/:id',restaurantController.getRestaurantById);
restaurantRouter.post('/',authenticate,restaurantController.createWithOwner);