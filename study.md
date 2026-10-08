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
