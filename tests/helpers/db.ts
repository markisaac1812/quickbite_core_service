import {db} from "../../src/lib/knex/knex";
import {env} from "../../src/lib/config/env";

/**
 * Safety net: if .env.test ever fails to load, env.ts falls back to the dev
 * `.env` and truncateAll would wipe dev data. Refuse anything that is not
 * explicitly a test database.
 */
export function assertTestDatabase(name: string): void {
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to touch non-test database "${name}" (name must end in "_test")`);
  }
}

export async function truncateAll():Promise<void> {
  assertTestDatabase(env.db.name);
  const result = await db.raw<{rows: {table_name: string}[]}>(
    `SELECT tablename AS table_name
     FROM pg_catalog.pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock');`,
  );
  const tableNames = result.rows.map((r) => `"${r.table_name}"`).join(", ");
  await db.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
}
