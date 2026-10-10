import { findNearbyBranches,createBranch,findBranchByRestaurantId, findBranchById, updateBranch } from "../repository/branch.repository";
import {SystemRole} from "../../user/entity/enums";
import {CreateBranchDTO} from "../dto/branch.dto";
import {findRestaurantById} from "../../restaurant/repository/restaurant.repository";
import {UnAuthorisedError} from "../../../common/auth/errors";
import {RestaurantNotFoundError} from "../../restaurant/errors";
import { BranchNotFoundError } from "../erros";

export class BranchService {

   findNearby = async(lat:number,lng:number)=>{
        const branches = await findNearbyBranches(lat,lng);
        return branches;
    }

    create = async (restaurantId: number, userId: number, userRole: SystemRole, data: CreateBranchDTO) => {
        const restaurant = await findRestaurantById(restaurantId);

        // if the logged in user is nto system admin and not the owner of restaurant then throw unauthorised err
        if(userRole != SystemRole.SYSTEM_ADMIN && (Number(restaurant.ownerId) !== Number(userId)) ){
            throw UnAuthorisedError
        }

        const now = new Date();
        const branch = await createBranch({
            restaurantId: restaurantId,
            label: data.label,
            countryCode: data.countryCode,
            lat: data.lat,
            lng: data.lng,
            addressText: data.addressText,
            isActive: false,
            opensAt: data.opensAt,
            closesAt: data.closesAt,
            currency: data.currency,
            deliveryRadius: data.deliveryRadius,
            commission: 0,
            createdAt: now,
            updatedAt: now,
            acceptOrders: true,
        });

        return branch;
    }

    findByRestaurantId = async (restaurantId: number) => {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant){
            throw RestaurantNotFoundError;
        }
        return await findBranchByRestaurantId(restaurantId);
    }
    
    update = async (branchId: number,userId:number,userRole: SystemRole, data: Partial<CreateBranchDTO>) => {
        // find branch by id
        const branch = await findBranchById(branchId);
        if(!branch){
            throw BranchNotFoundError;
        }

        // find its restaurant
        const restaurant = await findRestaurantById(branch.restaurantId);
        if(!restaurant){
            throw RestaurantNotFoundError;
        }

        // checks ownership of restaurant
        if(userRole != SystemRole.SYSTEM_ADMIN && (Number(restaurant.ownerId) !== Number(userId)) ){
            throw UnAuthorisedError
        }

        const updatedBranch = await updateBranch(branchId, data);
        return updatedBranch;
    }
}

export const branchService = new BranchService();