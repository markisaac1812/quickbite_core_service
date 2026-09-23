import { AppError } from "../../common/error/appError";
export const UserAlreadyExistsError = new AppError('User already exists', 400, true);
export const CannotSignupAsSystemAdmin = new AppError('You cannot register as a system admin', 403);