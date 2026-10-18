import {AppError} from "../../lib/error/appError";

export const UserNotFoundError = new AppError("User not found", 404);