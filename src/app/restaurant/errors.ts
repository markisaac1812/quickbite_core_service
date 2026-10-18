import { AppError } from "../../lib/error/appError"

export const RestaurantNotFoundError = new AppError("Restaurant not found", 404);
export const OwnerAlreadyExistsError = new AppError("Owner already exists", 400);