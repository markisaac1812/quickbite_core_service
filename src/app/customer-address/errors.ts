import {AppError} from "../../lib/error/appError";

export const AddressNotFoundError = new AppError('Address not found', 404);
