import { AppError } from "../../common/error/appError";
export const UserAlreadyExistsError = new AppError('User already exists', 400, true);
export const CannotSignupAsSystemAdmin = new AppError('You cannot register as a system admin', 403);
export const InvalidCredentialsError = new AppError('Invalid credentials', 401, true);
export const InvalidOTPError = new AppError('Invalid OTP', 400, true);
export const InvalidRefreshTokenError = new AppError('Invalid refresh token', 401, true);
export const RestaurantDataMissingError = new AppError('Restaurant data is missing', 400, true);