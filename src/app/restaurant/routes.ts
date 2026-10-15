import {Router} from "express";
import { restaurantController } from "./controller/restaurant.controller";
import { authenticate } from "../../common/auth/guard";
import { requireRestaurantMember } from "../../common/auth/rbac";
import {rbac} from "../../common/auth/rbac";

export const restaurantRouter = Router();

restaurantRouter.get('/',restaurantController.getAllRestaurants);
restaurantRouter.get('/:id',restaurantController.getRestaurantById);
restaurantRouter.post('/',authenticate,restaurantController.createWithOwner);
restaurantRouter.patch('/:id',authenticate,requireRestaurantMember('id'), rbac({resource:"core:restaurant", action:"update"}) ,restaurantController.updateRestaurant);
restaurantRouter.patch('/:id/status',authenticate,restaurantController.updateRestaurantStatus);