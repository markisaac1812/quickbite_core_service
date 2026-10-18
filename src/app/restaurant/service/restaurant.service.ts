import { Knex } from "knex";
import {RestaurantRegisterDTO} from "../../auth/dto/auth.dto";
import { RestaurantStatus } from "../entity/enums";
import { Restaurant } from "../entity/restaurant.entity";
import { createRestaurant,findAllRestaurants, findRestaurantById, updateRestaurant, updateRestaurantStatus } from "../repository/restaurant.repository";
import { RestaurantNotFoundError } from "../errors";
import { CreateRestaurantDTO, UpdateRestaurantDTO, UpdateRestaurantStatusDTO } from "../dto/restaurant.dto";
import { SystemRole } from "../../user/entity/enums";
import { UnAuthorisedError } from "../../../lib/auth/errors";
import {UserService } from "../../user/service/user.service";
import { db } from "../../../lib/knex/knex";
import {inject, injectable} from "tsyringe";
import {TOKENS} from "../../../lib/di/tokens";
import {buildPaginationResult, FilterParams, PaginationParams} from "../../../lib/http/pagination/cursor-pagination";

@injectable()
export class RestaurantService {
    constructor(@inject(TOKENS.UserService) private readonly userService: UserService) {}

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

    getAllRestaurants = async (params: PaginationParams,filters: FilterParams[]) => {
        // Implementation for fetching all restaurants
        const restaurants = await findAllRestaurants(params,filters);
        return buildPaginationResult(restaurants, params.limit, params.sortBy);
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

        // creates user
        const now = new Date();
        const tsx = await db.transaction()
        try{
            const user = await this.userService.create({
                email: data.owner.email,
                phone: data.owner.phone,
                name: data.owner.name,
                password: data.owner.password,
                systemRole: SystemRole.RESTAURANT_USER,
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

            // resolve from container to avoid circular dependency
            const {container: c} = require("../../../lib/di/container");
            const {TOKENS: T} = require("../../../lib/di/tokens");
            const memberSvc = c.resolve(T.MemberService);
            await memberSvc.createOwnerMember(restaurant.id, user.id, tsx);

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

    updateRestaurantStatus = async (userRole:SystemRole, id: number, data: UpdateRestaurantStatusDTO) => {
        const restaurant = await findRestaurantById(id);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }

        //checks if role is admin
        if(userRole !== SystemRole.SYSTEM_ADMIN) {
            throw UnAuthorisedError;
        }
        const updatedRestaurant = await updateRestaurantStatus(id, data.status);
        return updatedRestaurant;
    }
}    
