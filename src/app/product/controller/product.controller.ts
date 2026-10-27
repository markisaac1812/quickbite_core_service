import { SystemRole } from '../../user/entity/enums';
import { CreateProductDTO, UpdateProductDTO } from '../dto/product.dto';
import {ProductService } from '../service/product.service';
import { Request, Response, NextFunction } from 'express';
import {validateBody} from '../../../lib/validation/validate';
import { TOKENS } from '../../../lib/di/tokens';
import { inject, injectable } from 'tsyringe';
import {InvalidReserveItemsError, MissingProductIdsQueryError} from "../error";
import { sendSuccess } from '../../../lib/http/response';

@injectable()
export class ProductController{
    constructor(@inject(TOKENS.ProductService) private readonly productService: ProductService) {}

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

    findProductById = async(req:Request, res:Response, next:NextFunction) => {
        try{
            const productId = Number(req.params.productId);
            const product = await this.productService.findProductById(productId);
            return res.status(200).json({data: product});
        }catch(err){
            next(err);
        }
    }

    createProduct = async(req:Request, res:Response, next:NextFunction) => {
        try{
            const data = await validateBody(CreateProductDTO, req.body);
            const restaurantId = Number(req.params.restaurantId);
            const userId = Number(req.user?.userId);
            const userRole = req.user?.role as SystemRole;
            const product = await this.productService.createProduct(data, restaurantId, userId, userRole);
            return res.status(201).json({
                message: 'Product created successfully',
                data: product});
        }catch(err){
            next(err);
        }
    }

    updateProduct = async(req:Request, res:Response, next:NextFunction) => {
        try{
            const data = await validateBody(UpdateProductDTO, req.body);
            const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
            const productId = Number(req.params.productId);
            const userId = Number(req.user?.userId);
            const userRole = req.user?.role as SystemRole;
            const product = await this.productService.update(productId,userId, userRole,data,branchId);
            return res.status(200).json({
                message: 'Product updated successfully',
                data: product});
        }
        catch(err){
            next(err);
        }
    }
    findByBranchAndIds = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const branchId = Number(req.params.id);
            const raw = typeof req.query.ids === "string" ? req.query.ids : "";
            const ids = raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
            if (ids.length === 0) throw MissingProductIdsQueryError;
            const products = await this.productService.findByBranchAndIds(branchId, ids);
            sendSuccess(res, products);
        } catch (err) {
            next(err);
        }
    }

    reserveStock = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const branchId = Number(req.params.id);
            const items = req.body?.items;
            if (!Array.isArray(items) || items.length === 0) {
                throw InvalidReserveItemsError;
            }
            const result = await this.productService.reserveStock(branchId, items);
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    }

    releaseStock = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const branchId = Number(req.params.id);
            const items = req.body?.items;
            if (!Array.isArray(items) || items.length === 0) {
                throw InvalidReserveItemsError;
            }
            const result = await this.productService.releaseStock(branchId, items);
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    }
}
