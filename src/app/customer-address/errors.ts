import {AppError} from "../../common/error/AppError";

export const AddressNotFoundError = new AppError('Address not found', 404);
