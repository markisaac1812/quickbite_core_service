import {AppError} from "../../common/error/appError";
export const ProductNotFoundError = new AppError("Product not found", 404);