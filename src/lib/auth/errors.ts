import {AppError} from "../error/appError";

export const NotAuthenticatedError = new AppError("Invalid token credentials", 403);
export const UnAuthorisedError = new AppError("You are not authorised to perform this action", 403);