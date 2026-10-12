import { findRestaurantById } from "../../restaurant/repository/restaurant.repository"
import { RestaurantNotFoundError } from "../../restaurant/errors";
import { findCategoriesByRestaurantId,findCategoryByName,createCategory } from "../repository/product-category.repo";
import {findBranchById} from "../../branch/repository/branch.repository";
import { BranchNotFoundError } from "../../branch/erros";
import { createProduct, findProductById, findProductByrestaurantId, findProductsByBranch,updateProduct } from "../repository/product.repo";
import { SystemRole } from "../../user/entity/enums";
import { UnAuthorisedError } from "../../../common/auth/errors";
import { ProductNotFoundError } from "../error";
import { CreateProductDTO,UpdateProductDTO } from "../dto/product.dto";
import { updateBranchDetails } from "../repository/product-branch.repo";

export class ProductService {
    findCategoriesByRestaurantId = async(restaurantId: number)=> {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }
        return await findCategoriesByRestaurantId(restaurantId);
    }

    findProductsByBranch = async(branchId: number)=> {
        const branch = await findBranchById(branchId);
        if(!branch) {
            throw BranchNotFoundError;
        }
        return await findProductsByBranch(branchId);
    }

    findProductByrestaurantId = async(restaurantId: number,userId: number,userRole: SystemRole) => {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }

        if(userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
                    throw UnAuthorisedError;
        };
        return await findProductByrestaurantId(restaurantId);
    }

    findProductById = async(productId: number) => {
        const product = await findProductById(productId);
        if(!product) {
            throw ProductNotFoundError;
        }
        return product;
    }

    createProduct = async(data: CreateProductDTO, restaurantId: number, userId: number, userRole: SystemRole) => {
        const restaurant = await findRestaurantById(restaurantId);
        if(!restaurant) {
            throw RestaurantNotFoundError;
        }

        if(userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
                    throw UnAuthorisedError;
        };

        let categoryId: number | null = null;
        if (data.categoryName) {
            let category = await findCategoryByName(restaurantId, data.categoryName);
            if (!category) {
                category = await createCategory(restaurantId, data.categoryName);
            }
            categoryId = category.id;
        }

        return await createProduct({
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
            restaurantId,
            categoryId,
        });
    }

    update = async (productId: number, userId: number, userRole: SystemRole, data: UpdateProductDTO, branchId?: number) => {
        const product = await findProductById(productId);
        if (!product) {
            throw ProductNotFoundError;
        }

        const restaurant = await findRestaurantById(product.restaurantId);
        if (!restaurant) throw RestaurantNotFoundError;
        if (userRole !== SystemRole.SYSTEM_ADMIN && Number(restaurant.ownerId) !== Number(userId)) {
            throw UnAuthorisedError;
        }

        let categoryId: number | undefined = undefined;
        if (data.categoryName) {
            let category = await findCategoryByName(product.restaurantId, data.categoryName);
            if (!category) {
                category = await createCategory(product.restaurantId, data.categoryName);
            }
            categoryId = category.id;
        }

        const updatedProduct = await updateProduct(productId, {
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
            categoryId,
        });

        let branchDetails;
        if (branchId && (data.price !== undefined || data.stock !== undefined || data.isAvailable !== undefined)) {
            branchDetails = await updateBranchDetails(branchId, productId, {
                price: data.price,
                stock: data.stock,
                isAvailable: data.isAvailable,
            });
        }

        return {product: updatedProduct, branchDetails};
    }
}


export const productService = new ProductService();