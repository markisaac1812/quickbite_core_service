import {AppError} from "../error/appError";

export const NotAuthenticatedError = new AppError("Invalid token credentials", 401);
export const UnAuthorisedError = new AppError("You are not authorised to perform this action", 403);