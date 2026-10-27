import {Branch} from "./entity/branch.entity";

export interface BranchWithRestaurant {
    branch: Branch;
    restaurantStatus: string;
    restaurantOwnerId: number;
}
