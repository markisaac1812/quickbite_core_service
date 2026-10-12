import {Router} from 'express';
import { productController } from './controller/product.controller';
import { authenticate } from '../../common/auth/guard';

export const productRouter = Router();

productRouter.get('/restaurants/:restaurantId/categories', productController.findCategories);
productRouter.get('/branches/:branchId/products', productController.findProductsByBranch);
productRouter.get('/products/:productId', productController.findProductById);
productRouter.get('/restaurants/:restaurantId/products', authenticate, productController.findProductByrestaurantId);
productRouter.post('/restaurants/:restaurantId/products', authenticate, productController.createProduct);
productRouter.patch('/products/:id?branchId', authenticate, productController.updateProduct);