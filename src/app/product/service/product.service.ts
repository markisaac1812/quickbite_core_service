import { findRestaurantById } from "../../restaurant/repository/restaurant.repository"
import { RestaurantNotFoundError } from "../../restaurant/errors";
import { findCategoriesByRestaurantId } from "../repository/product-category.repo";
import {findBranchById} from "../../branch/repository/branch.repository";
import { BranchNotFoundError } from "../../branch/erros";
import { findProductsByBranch } from "../repository/product.repo";

export class ProductService {
    async findCategoriesByRestaurantId(restaurantId: number) {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }
        return await findCategoriesByRestaurantId(restaurantId);
    }

    async findProductsByBranch(branchId: number) {
        const branch = await findBranchById(branchId);
        if(!branch) {
            throw BranchNotFoundError;
        }
        return await findProductsByBranch(branchId);
    }
}

export const productService = new ProductService();