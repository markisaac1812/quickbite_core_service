import {Router} from 'express';
import { productController } from './controller/product.controller';
import { authenticate } from '../../common/auth/guard';
import { requireRestaurantMember,rbac, requireBranchAccess } from '../../common/auth/rbac';

export const productRouter = Router();

productRouter.get('/restaurants/:restaurantId/categories', productController.findCategories);
productRouter.get('/branches/:branchId/products', productController.findProductsByBranch);
productRouter.get('/products/:productId', productController.findProductById);
productRouter.get('/restaurants/:restaurantId/products', authenticate,requireRestaurantMember('restaurantId'),rbac({resource:"core:product", action:"read"}), productController.findProductByrestaurantId);
productRouter.post('/restaurants/:restaurantId/products', authenticate,requireRestaurantMember('restaurantId'),rbac({resource:"core:product", action:"create"}), productController.createProduct);
productRouter.patch('/products/:id', authenticate,requireBranchAccess('branchId'),rbac({resource:"core:product", action:"update"}), productController.updateProduct);