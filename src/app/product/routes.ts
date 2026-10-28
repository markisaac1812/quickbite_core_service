import {Router} from 'express';
import { ProductController } from './controller/product.controller';
import { authenticate } from '../../lib/auth/guard';
import { requireRestaurantMember,rbac, requireBranchAccess } from '../../lib/auth/rbac';
import { container } from '../../lib/di/container';
import { TOKENS } from '../../lib/di/tokens';
import { requireInternalApiKey} from '../../lib/auth/api-key';

export const productRouter = Router();

const productController = container.resolve<ProductController>(TOKENS.ProductController);

productRouter.get('/restaurants/:restaurantId/categories', productController.findCategories);
productRouter.get('/branches/:branchId/products', productController.findProductsByBranch);
productRouter.get('/products/:productId', productController.findProductById);

productRouter.get('/restaurants/:restaurantId/products', authenticate,requireRestaurantMember('restaurantId'),rbac({resource:"core:product", action:"read"}), productController.findProductByrestaurantId);
productRouter.post('/restaurants/:restaurantId/products', authenticate,requireRestaurantMember('restaurantId'),rbac({resource:"core:product", action:"create"}), productController.createProduct);
productRouter.patch('/products/:productId', authenticate,requireBranchAccess('branchId'),rbac({resource:"core:product", action:"update"}), productController.updateProduct);

// Internal (service-to-service)
productRouter.get('/internal/branches/:id/products', requireInternalApiKey, productController.findByBranchAndIds);
productRouter.post('/internal/branches/:id/reserve-stock', requireInternalApiKey, productController.reserveStock);
productRouter.post('/internal/branches/:id/release-stock', requireInternalApiKey, productController.releaseStock);
    