import {db} from "../../src/lib/knex/knex";

export async function truncateAll():Promise<void> {
  const result = await db.raw<{rows: {table_name: string}[]}>(
    `SELECT tablename AS table_name
     FROM pg_catalog.pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock');`,
  );
  const tableNames = result.rows.map((r) => `"${r.table_name}"`).join(", ");
  await db.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
}