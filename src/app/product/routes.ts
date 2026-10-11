import {Router} from 'express';
import { productController } from './controller/product.controller';

export const productRouter = Router();

productRouter.get('/restaurants/:restaurantId/categories', productController.findCategories);
productRouter.get('/branches/:branchId/products', productController.findProductsByBranch);