import { Knex } from "knex";
import {RestaurantRegisterDTO} from "../../auth/dto/auth.dto";
import { RestaurantStatus } from "../entity/enums";
import { Restaurant } from "../entity/restaurant.entity";
import { createRestaurant } from "../repository/restaurant.repository";

export class RestaurantService {
    createRestaurant = async (userId:number,data: RestaurantRegisterDTO,trx:Knex) => {
        const now = new Date();
        const restaurant = new Restaurant({
            ownerId: userId,
            name: data.name,
            logoURL: data.logoURL ?? "",
            primaryCountry: data.primaryCountry,
            status: RestaurantStatus.PENDING,
            createdAt: now,
            updatedAt: now,
            statusUpdatedAt: now,
        })
        console.log(restaurant);
        const result = await createRestaurant(restaurant,trx);
        return result;
    }
}

export const restaurantService = new RestaurantService();