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
}    

export const productController = new ProductController(productService);