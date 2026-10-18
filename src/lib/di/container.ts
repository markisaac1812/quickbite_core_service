import {container} from "tsyringe";
import {TOKENS} from "./tokens";
import {Logger} from "../logger/logger";

//infrastructure
container.registerSingleton<Logger>(TOKENS.Logger, Logger);

//services
import {AuthService} from "../../app/auth/service/auth.service";
import {UserService} from "../../app/user/service/user.service";
import {RestaurantService} from "../../app/restaurant/service/restaurant.service";
import {BranchService} from "../../app/branch/service/branch.service";
import {MemberService} from "../../app/rbac/service/member.service";
import {ProductService} from "../../app/product/service/product.service";
import {CustomerAddressService} from "../../app/customer-address/service/customer-address.service";
import {PermissionCacheService} from "../../app/rbac/service/permission-cache.service";


//controllers
import {AuthController} from "../../app/auth/controller/auth.controller";
import {UserController} from "../../app/user/controller/user.controller";
import {RestaurantController} from "../../app/restaurant/controller/restaurant.controller";
import {BranchController} from "../../app/branch/controller/branch.controller";
import {MemberController} from "../../app/rbac/controller/member.controller";
import {ProductController} from "../../app/product/controller/product.controller";
import {CustomerAddressController} from "../../app/customer-address/controller/customer-address.controller";

// Logger



container.registerSingleton<UserService>(TOKENS.UserService, UserService);
container.registerSingleton<RestaurantService>(TOKENS.RestaurantService, RestaurantService);
container.registerSingleton<BranchService>(TOKENS.BranchService, BranchService);
container.registerSingleton<ProductService>(TOKENS.ProductService, ProductService);
container.registerSingleton<MemberService>(TOKENS.MemberService, MemberService);
container.registerSingleton<CustomerAddressService>(TOKENS.CustomerAddressService, CustomerAddressService);
container.registerSingleton<PermissionCacheService>(TOKENS.PermissionCacheService, PermissionCacheService);
container.registerSingleton<AuthService>(TOKENS.AuthService, AuthService);

container.registerSingleton<AuthController>(TOKENS.AuthController, AuthController);
container.registerSingleton<UserController>(TOKENS.UserController, UserController);
container.registerSingleton<RestaurantController>(TOKENS.RestaurantController, RestaurantController);
container.registerSingleton<BranchController>(TOKENS.BranchController, BranchController);
container.registerSingleton<ProductController>(TOKENS.ProductController, ProductController);
container.registerSingleton<MemberController>(TOKENS.MemberController, MemberController);
container.registerSingleton<CustomerAddressController>(TOKENS.CustomerAddressController, CustomerAddressController);

export {container};