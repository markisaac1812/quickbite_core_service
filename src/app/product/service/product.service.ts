import { findRestaurantById } from "../../restaurant/repository/restaurant.repository"
import { RestaurantNotFoundError } from "../../restaurant/errors";
import { findCategoriesByRestaurantId } from "../repository/product-category.repo";
import {findBranchById} from "../../branch/repository/branch.repository";
import { BranchNotFoundError } from "../../branch/erros";
import { findProductById, findProductByrestaurantId, findProductsByBranch } from "../repository/product.repo";
import { SystemRole } from "../../user/entity/enums";
import { UnAuthorisedError } from "../../../common/auth/errors";
import { ProductNotFoundError } from "../error";

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

    async findProductByrestaurantId(restaurantId: number,userId: number,userRole: SystemRole) {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }
        if(userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
                    throw UnAuthorisedError;
                };
        return await findProductByrestaurantId(restaurantId);
    }

    async findProductById(productId: number) {
        const product = await findProductById(productId);
        if(!product) {
            throw ProductNotFoundError;
        }
        return product;
    }
}

export const productService = new ProductService();