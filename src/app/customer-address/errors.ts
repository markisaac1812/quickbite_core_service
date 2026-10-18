import {AppError} from "../../lib/error/AppError";

export const AddressNotFoundError = new AppError('Address not found', 404);
