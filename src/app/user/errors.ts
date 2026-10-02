import {AppError} from "../../common/error/appError";

export const UserNotFoundError = new AppError("User not found", 404);