import { SystemRole } from '../../user/entity/enums';
import { productService, ProductService } from '../service/product.service';
import { Request, Response, NextFunction } from 'express';

export class ProductController{
    constructor(private readonly productService: ProductService) {}

    findCategories = async(req:Request, res:Response, next:NextFunction) => {
        try{
            const restaurantId = Number(req.params.restaurantId);
            const categories = await this.productService.findCategoriesByRestaurantId(restaurantId);
            return res.status(200).json({data: categories});
        }catch(err){
            next(err);
        }
    }

    findProductsByBranch = async(req:Request, res:Response, next:NextFunction) => {
        try{
            const branchId = Number(req.params.branchId);
            const products = await this.productService.findProductsByBranch(branchId);
            return res.status(200).json({data: products});
        }catch(err){
            next(err);
        }
    }

    findProductByrestaurantId = async(req:Request, res:Response, next:NextFunction) => {
        try{
            const restaurantId = Number(req.params.restaurantId);
            const userId = Number(req.user?.userId);
            const userRole = req.user?.role as SystemRole;
            const products = await this.productService.findProductByrestaurantId(restaurantId, userId, userRole);
            return res.status(200).json({data: products});
        }catch(err){
            next(err);
        }
    }
}

export const productController = new ProductController(productService);