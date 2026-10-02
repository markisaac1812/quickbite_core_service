import {AppError} from "../error/appError";

export const NotAuthenticatedError = new AppError("Invalid token credentials", 403);