import { AppError } from "../../lib/error/appError";
export const CannotCreateOwnerUserError = new AppError("Cannot create owner user", 400);
export const RoleNotFoundError = new AppError("Role not found", 404);
export const MemberNotFoundError = new AppError('Member not found', 404);
export const CannotDeleteOwnerError = new AppError('Cannot delete the restaurant owner', 400);
export const AssignBranchesToOwnerError = new AppError('Cannot assign branches to owners, they have access to all branches', 400);
export const InvalidBranchIdsError = new AppError('Invalid branch IDs', 400);