import {Request, Response, NextFunction} from "express";
import {permissionCacheService} from "../../app/rbac/service/permission-cache.service";
import {SystemRole} from "../../app/user/entity/enums";
import {NotAuthenticatedError} from "./errors";

export interface RBACOptions {
    resource: string;
    action: string;
    allowSystemAdmin?: boolean; // by default will be true
}
// check for permissions
// system admin bypass this
// restaurant users must have permissions for their role

// router.post('/products', authenticate, rbac({resource:"product",action:"create"}), productController.create)

export function rbac(options: RBACOptions) {
    return async(req: Request, res: Response, next: NextFunction) => {
        // req.user is there , if not we will bail
        try {
            if (!req.user) {
                throw NotAuthenticatedError;
            }
            const {resource, action, allowSystemAdmin = true} = options;

            // if he is a system admin -> bypass
            if (allowSystemAdmin && req.user.role == SystemRole.SYSTEM_ADMIN) {
                return next();
            }
            // if restaurant user
            // 1. fetch permissions
            // 2. check if the permissions has the action for this resource
            if (req.user.role == SystemRole.RESTAURANT_USER) {
                const permissions = await permissionCacheService.getPermissions(req.user.restaurantRole!);
                if (!permissionCacheService.hasPermission(permissions, resource, action)) {
                    return res.status(403).json({
                        error: "Permission denied",
                    })
                }
                // pass
                return next();
            }
            // if not restaurant ser -> throw err
            return res.status(403).json({
                error: "Permission denied",
            })
        }
        catch (error) {
            next(error);
        }
    }
}

export function requireRestaurantMember(paramName: string= 'restaurantId') {
    return async(req: Request, res: Response, next: NextFunction) => {
        const restaurantId = parseInt(req.params[paramName] as string); // req.params.restaurantId
        if (!restaurantId) {
            return res.status(500).json({"message": "something went wrong"});
        }

        if(Number(req.user?.restaurantId) !== Number(restaurantId)) {
            if(req.user?.role == SystemRole.SYSTEM_ADMIN) {
                return next();
            }
            return res.status(403).json({
                error: "Permission denied",
            })
        }
        next();
    }
}

export async function requireBranchAccess(paramName: string= 'branchId') {
    return async(req: Request, res: Response, next: NextFunction) => {
        // check if the user has access to the branch
        next();
    }
} {}

