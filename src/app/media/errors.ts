import {AppError} from "../../lib/error/appError";

export const MediaNotFoundError = new AppError("Media not found", 404);
export const RestaurantIdRequiredError = new AppError("restaurantId is required", 400);
export const FileNotUploadedError = new AppError("File not found in storage. PUT the file to uploadUrl before confirming", 400);
export const UploadMismatchError = new AppError("Uploaded file does not match the requested content type or size", 400);
export const MediaUploadFailedError = new AppError("This upload has failed. Request a new upload URL", 409);
