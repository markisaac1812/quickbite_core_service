import { Knex } from "knex";
import {RestaurantRegisterDTO} from "../../auth/dto/auth.dto";
import { RestaurantStatus } from "../entity/enums";
import { Restaurant } from "../entity/restaurant.entity";
import { createRestaurant,findAllRestaurants, findRestaurantById, updateRestaurant } from "../repository/restaurant.repository";
import { OwnerAlreadyExistsError, RestaurantNotFoundError } from "../errors";
import { CreateRestaurantDTO, UpdateRestaurantDTO } from "../dto/restaurant.dto";
import { SystemRole } from "../../user/entity/enums";
import { UnAuthorisedError } from "../../../common/auth/errors";
import { createUser, findUserExistsByEmailOrPhone } from "../../user/repository/user.repo";
import { hashPassword } from "../../auth/utils";
import { db } from "../../../common/knex/knex";

export class RestaurantService {
    create = async (userId:number,data: RestaurantRegisterDTO,trx:Knex) => {
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

    getAllRestaurants = async () => {
        // Implementation for fetching all restaurants
        const restaurants = await findAllRestaurants();
        return restaurants;
    }

    getRestaurantById = async (id: number) => {
        // Implementation for fetching a restaurant by ID
        const restaurant = await findRestaurantById(id);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }
        return restaurant;
    }
    createWithOwner = async (userRole:SystemRole,data: CreateRestaurantDTO) => {
        // checks role is system admin
        if(userRole !== SystemRole.SYSTEM_ADMIN) {
            throw UnAuthorisedError;
        }

        // checks user not in db
        const existing = await findUserExistsByEmailOrPhone(data.owner.email,data.owner.phone);
        if(existing) {
            throw OwnerAlreadyExistsError
        }

        // hashes password
        const hashedPassowrd = await hashPassword(data.owner.password)

        // creates user
        const now = new Date();
        const tsx = await db.transaction()
        try{
            const user = await createUser({
                email: data.owner.email,
                phone: data.owner.phone,
                name: data.owner.name,
                passwordHash: hashedPassowrd,
                systemRole: SystemRole.RESTAURANT_USER,
                createdAt: now,
                updatedAt: now,
        },tsx);

            const restaurant = await createRestaurant(new Restaurant({
                ownerId: user.id,
                name: data.name,
                logoURL: data.logoURL ?? "",
                primaryCountry: data.primaryCountry,
                status: RestaurantStatus.ACTIVE,
                createdAt: now,
                updatedAt: now,
                statusUpdatedAt: now,
            }),tsx);

            await tsx.commit();
            return {
                restaurant,
                owner: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    name: user.name,
                    systemRole: user.systemRole,
                },
            };

        } catch (error) {
            await tsx.rollback();
            throw error;
        }
    }

    updateRestaurant = async (userRole: SystemRole, userID:Number, id: number, data: UpdateRestaurantDTO) => {
        // finds the restaurant with the given id
        const restaurant = await findRestaurantById(id);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }

        //checks the caller is owner or the admin
        if(userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userID)) {
            throw UnAuthorisedError;
        }

        const now = new Date();
        const updatedRestaurant = await updateRestaurant(id, {
            name: data.name ,
            logoURL: data.logoURL ,
            primaryCountry: data.primaryCountry,
            updatedAt: now,
        });

        return updatedRestaurant;
    }
}    

export const restaurantService = new RestaurantService();