import {Router} from "express";
import { authenticate } from "../../lib/auth/guard";
import { requireRestaurantMember } from "../../lib/auth/rbac";
import {rbac} from "../../lib/auth/rbac";
import { container } from "../../lib/di/container";
import { TOKENS } from "../../lib/di/tokens";
import { RestaurantController } from "./controller/restaurant.controller";

export const restaurantRouter = Router();

const restaurantController = container.resolve<RestaurantController>(TOKENS.RestaurantController);

restaurantRouter.get('/',restaurantController.getAllRestaurants);
restaurantRouter.get('/:id',restaurantController.getRestaurantById);
restaurantRouter.post('/',authenticate,restaurantController.createWithOwner);
restaurantRouter.patch('/:id',authenticate,requireRestaurantMember('id'), rbac({resource:"core:restaurant", action:"update"}) ,restaurantController.updateRestaurant);
restaurantRouter.patch('/:id/status',authenticate,restaurantController.updateRestaurantStatus);