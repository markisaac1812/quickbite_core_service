export const TOKENS = {
    // Services
    AuthService: Symbol.for("AuthService"),
    UserService: Symbol.for("UserService"),
    RestaurantService: Symbol.for("RestaurantService"),
    BranchService: Symbol.for("BranchService"),
    MemberService: Symbol.for("MemberService"),
    ProductService: Symbol.for("ProductService"),
    CustomerAddressService: Symbol.for("CustomerAddressService"),
    PermissionCacheService: Symbol.for("PermissionCacheService"),
    // Controllers
    AuthController: Symbol.for("AuthController"),
    UserController: Symbol.for("UserController"),
    RestaurantController: Symbol.for("RestaurantController"),
    BranchController: Symbol.for("BranchController"),
    MemberController: Symbol.for("MemberController"),
    ProductController: Symbol.for("ProductController"),
    CustomerAddressController: Symbol.for("CustomerAddressController"),
    // Lib/infra/
    Logger: Symbol.for("Logger"),
    CacheProvider: Symbol.for("CacheProvider"),
}