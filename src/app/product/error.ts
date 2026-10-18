import {AppError} from "../../lib/error/appError";
export const ProductNotFoundError = new AppError("Product not found", 404);