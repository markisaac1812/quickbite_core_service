import { findNearbyBranches,createBranch,findBranchesByRestaurant, findBranchById, updateBranch, updateBranchStatus, findBranchesByIds} from "../repository/branch.repository";
import {SystemRole} from "../../user/entity/enums";
import {CreateBranchDTO, UpdateBranchStatusDTO,UpdateBranchDTO} from "../dto/branch.dto";
import {findRestaurantById,findRestaurantsByIds} from "../../restaurant/repository/restaurant.repository";
import {UnAuthorisedError} from "../../../lib/auth/errors";
import {RestaurantNotFoundError} from "../../restaurant/errors";
import { BranchNotFoundError } from "../erros";
import { injectable } from "tsyringe";
import { BranchWithRestaurant } from "../types";
import {db} from "../../../lib/knex/knex";
import {insertOutboxEvent} from "../../../lib/events/outbox.repo";
import {EVENT_TYPES} from "../../../lib/events/event-types";
import {cacheProvider} from "../../../lib/cache/init";


@injectable()
export class BranchService {

   findNearby = async(lat:number,lng:number)=>{
        const branches = await findNearbyBranches(lat,lng);
        return branches;
    }

    create = async (restaurantId: number, userId: number, userRole: SystemRole, data: CreateBranchDTO) => {
        const restaurant = await findRestaurantById(restaurantId);

        if(!restaurant){
            throw RestaurantNotFoundError;
        }

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
        return await findBranchesByRestaurant(restaurantId);
    }
    
    update = async (branchId: number, userId: number, userRole: SystemRole, data: UpdateBranchDTO) => {
        const branch = await findBranchById(branchId);
        if (!branch) {
            throw BranchNotFoundError;
        }

        const restaurant = await findRestaurantById(branch.restaurantId);
        if (!restaurant) throw RestaurantNotFoundError;
        if (userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
            throw UnAuthorisedError;
        }

        const trx = await db.transaction();
        try {
            const updated = await updateBranch(branchId, data, trx);
            await insertOutboxEvent(trx, {
                aggregateType: "restaurant_branches",
                aggregateId: branchId,
                eventType: EVENT_TYPES.BRANCH_UPDATED,
                payload: {branchId},
            });
            await trx.commit();
            await cacheProvider.del(`GET:/api/internal/branches/${branchId}`);
            return updated;
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    updateStatus = async (branchId: number, userRole: SystemRole, data: UpdateBranchStatusDTO) => {
        if (userRole !== SystemRole.SYSTEM_ADMIN) {
            throw UnAuthorisedError;
        }

        const branch = await findBranchById(branchId);
        if (!branch) {
            throw BranchNotFoundError;
        }

        const trx = await db.transaction();
        try {
            const updated = await updateBranchStatus(branchId, data, trx);
            const eventType = data.isActive === false
                ? EVENT_TYPES.BRANCH_DEACTIVATED
                : EVENT_TYPES.BRANCH_UPDATED;
            await insertOutboxEvent(trx, {
                aggregateType: "restaurant_branches",
                aggregateId: branchId,
                eventType,
                payload: {branchId},
            });
            await trx.commit();
            await cacheProvider.del(`GET:/api/internal/branches/${branchId}`);
            return updated;
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    }

    findByIdWithRestaurant = async (branchId: number): Promise<BranchWithRestaurant | null> => {
        const branch = await findBranchById(branchId);
        if (!branch) return null;
        const restaurant = await findRestaurantById(branch.restaurantId);
        if(!restaurant) return null;
        return {
            branch,
            restaurantStatus: restaurant.status,
            restaurantOwnerId: Number(restaurant.ownerId),
        };
    }

    findByIdsWithRestaurant = async (branchIds: number[]): Promise<BranchWithRestaurant[]> => {
        if (branchIds.length === 0) return [];
        const branches = await findBranchesByIds(branchIds);
        if (branches.length === 0) return [];
        const restaurants = await findRestaurantsByIds(Array.from(new Set(branches.map((b) => b.restaurantId))));
        const byId = new Map(restaurants.map((r) => [Number(r.id), r]));
        const out: BranchWithRestaurant[] = [];
        for (const branch of branches) {
            const restaurant = byId.get(Number(branch.restaurantId));
            if (!restaurant) continue;
            out.push({
                branch,
                restaurantStatus: restaurant.status,
                restaurantOwnerId: Number(restaurant.ownerId),
            });
        }
        return out;
    }
}

