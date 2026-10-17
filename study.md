###### plan for implmenting any API
Database migrations
* implement bottom up approach
Create Entity classes that represent DB
Create repository queries
Create service functions (make dto if needed)
Create controllers
Create routes
insert it into src/routes if it is the first time we create this router in the module
Test , Repeat


dto have api contracts (like the same name in requests)


module 8 , service A part 2:
## Knex vs Prisma

### Knex

Knex is a **SQL query builder** for Node.js. It helps us write SQL using JavaScript or TypeScript, but we still control the tables, columns, joins, and queries.

```ts
await db('users').where({ id }).first();
```

Knex migrations are versioned files that create or change the database structure:

```powershell
npx tsx ./node_modules/knex/bin/cli.js migrate:latest --knexfile src/common/knex/knexfile.ts
```

### Prisma

Prisma is an **ORM**. We describe the database models in `schema.prisma`, and Prisma generates a type-safe client for database operations.

```ts
await prisma.user.findUnique({ where: { id } });
```

### Easy memory rule

**Knex = SQL control.**  
**Prisma = model abstraction.**

- Knex is closer to SQL and gives more query flexibility.
- Prisma reduces SQL writing and gives generated types and a convenient client.
- Knex migrations are written as JavaScript or TypeScript files.
- Prisma migrations are generated from changes to `schema.prisma`.
- Both can manage migrations and communicate with databases; they are not databases themselves.

. knex geenrate UP AND DOWN function . up is where you identify your table (creat table,alter table,add col etc) where down is the the revret option drop table etc .

##### camelcase vs snakeCase
- for database migrations use snakecase
- for entity files use Camelcase
- DTO camelcase
- repository have toEnitty function for mapping . and make sure e.g      entityattribute: nameinDB
- well in create function in repo (in sql commands) ofc use the name in the database mapped to entity e.g owner_id: data.ownerId


###### IsNotEmpty() vs IsOptional()
IsOptional(): The field is allowed to be missing (undefined) or null. If it is, the other validators on that property are skipped.
IsNotEmpty():If the field is provided, it must not be an empty string ("").


###### migrations command
npx tsx ./node_modules/knex/bin/cli.js migrate:latest --knexfile src/common/knex/knexfile.ts
npx tsx ./node_modules/knex/bin/cli.js migrate:make create_user_table --knexfile src/common/knex/knexfile.ts


###### TRIGGER IN postgres
A trigger in PostgreSQL is something that automatically executes a function when a specific event happens in a database table, such as inserting, updating, or deleting a row.
In your code, the trigger automatically creates a product_branch_details record for every branch belonging to the restaurant whenever a new product is created.


###### CACHE IN APP VS REDIS
in creating rbac middleware to find for each request what is roles and permissions associated it with , it is very headache to request db each time => use cache 
now we basically have 3 roles owner,branch_manager,staff so no need to use cache db such as redis , caching in the application is perfectly fine here


###### REST CONVENTIALS
in your apis desing alwyas start from higher entity to entity 
e.g api/restaurants/:restaurantID/branches/:branchesID/members -> TRUE
    api/branches/:brnachesID/restaurants/:restaurantID -> FALSE


###### HOW RBAC WORKS
RBAC means **Role-Based Access Control**. It answers this question: **"Is this user allowed to do this action?"**

Simple example:

```ts
rbac({ resource: "product", action: "create" })
```

This means the user needs the `product:create` permission to continue.

### Simple RBAC flow

1. **Authentication runs first.** The `authenticate` middleware checks the user's token. If it is valid, it puts the user's information in `req.user`.
2. **RBAC checks that a user exists.** If `req.user` is missing, the request is not authenticated and the request stops with an authentication error.
3. **System admins can bypass the permission check.** By default, a user with the `system_admin` role is allowed through. A route can disable this with `allowSystemAdmin: false`.
4. **Restaurant users are checked by their restaurant role.** The middleware gets the role's permissions, such as `product:create` or `branch:read`.
5. **Permissions are cached.** The application first looks in its in-memory cache. If the role's permissions are not cached, it loads them from the database and caches them for one hour.
6. **The requested permission is compared.** For `resource: "product"` and `action: "create"`, the middleware looks for `product:create`.
7. **The request either continues or stops.** If the permission exists, `next()` sends the request to the next middleware or controller. If it does not exist, the API returns `403 Permission denied`.
8. **Other roles are denied.** A user who is not a system admin or restaurant user is not allowed through this middleware.

### Restaurant and branch scope

The `rbac` middleware checks **what** the user can do. The other middleware functions check **where** the user can do it:

- `requireRestaurantMember` checks that the user's `restaurantId` matches the restaurant in the URL. System admins can bypass this check.
- `requireBranchAccess` checks the requested `branchId`. System admins and restaurant owners can access all branches. Other users can access only the branch IDs in their `req.user.branchIds` list.
- If an endpoint does not include a branch ID, `requireBranchAccess` lets the request continue.

### Full request example

```text
Request: POST /restaurants/10/products
  -> authenticate
    Verify the token and set req.user
  -> requireRestaurantMember
    Check that the user belongs to restaurant 10
  -> requireBranchAccess
    Check that the user can access the requested branch
  -> rbac({ resource: "product", action: "create" })
    Check the user's role for product:create
  -> product controller
    Run the actual business logic
```

In short: **authentication proves who the user is, scope middleware checks where they can work, and RBAC checks what they can do.**

###### HOW ALL MIDDLEWARES WORK TOGETHER
Route (express router)
  -> authenticate (verify JWT, set req.user)
  -> requireRestaurantMember (verify user belongs to restaurant)
  -> requireBranchAccess (verify user has access to branch)
  -> rbac (verify user's role has the required permission)
  -> Controller (validates DTO, extracts params)
    -> Service (business logic, orchestrates repos)
      -> Repository (DB queries via knex)    


###### BEST PRACTISE

Service A should not call the repository of Service B directly. Service A should call Service B, and Service B should call its own repository.

This is important because each service owns its business rules and database details. Keeping that boundary:

- prevents business rules from being duplicated or bypassed
- keeps repository changes local to the service that owns them
- makes transactions and validation easier to coordinate
- makes services easier to test by replacing dependencies with mocks
- reduces coupling between modules

For example, `RestaurantService` should not import `createUser` from the user repository. It should depend on `UserService` and ask it to create the user:

```ts
export class RestaurantService {
  constructor(
    private readonly userService: UserService,
    private readonly memberService: MemberService,
  ) {}

  createWithOwner = async (data: CreateRestaurantDTO, trx: Knex.Transaction) => {
    const user = await this.userService.create({
      email: data.owner.email,
      phone: data.owner.phone,
      name: data.owner.name,
      password: data.owner.password,
      systemRole: SystemRole.RESTAURANT_USER,
    }, trx);

    const restaurant = await this.create(user.id, data, trx);
    await this.memberService.createOwnerMember(restaurant.id, user.id, trx);
  };
}
```

The dependency is supplied through the constructor (constructor dependency injection):

```ts
const restaurantService = new RestaurantService(userService, memberService);
```

The service receives its dependencies from outside instead of creating them internally. This keeps the dependency direction clear:

```text
RestaurantService -> UserService -> UserRepository
RestaurantService -> MemberService -> MemberRepository
```

Each service owns its repository, while other services use its public methods. This rule should also be followed when the operation needs a shared transaction: pass the transaction into the called service rather than bypassing that service and calling its repository directly.


###### COMMON VS LIB VS PKG
first the project have all shared functions in common dir , but this is not best practise it should have
LIB: for shared function across my application only ( not tother servces just my app ) and pkg have shared function across all my serivces or all my codebase that anyone can import it

###### INJECTABLE() VS INJECT
at the begining if we needed service A to call Service B repo that was allowed , then we did use dependecy injection to allow only Service A to call Serivce B then service B call its repo . then part of improved architecture . now we used sth called injectable and inject :
Injectable(): ya3ni fih 7aga b depened 3lek e.g injectable authController -> ya3ni fih class by depended 3la auth controller . inject ya3ni anta bt depend 3la 7aga e,g inject member service -> anta be dependd 3la member service


###### CORS , HELMET BASIC SECURITY RISKS
cors:(Cross-Origin Resource Sharing) is a browser security mechanism that allows a web page running on one domain to safely request and access resources from a server on a different domain. ya3ni bet specify domains eli anta 3ayzha bs t3ml request ll backend bta3k ay 7aga bara dol rejected
Helmet: that helps protect your app from common web vulnerabilities by automatically setting secure HTTP response headers.