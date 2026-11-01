import {db} from "../../src/lib/knex/knex";
import {env} from "../../src/lib/config/env";
import {up as seedRbac} from "../../src/migrations/20261012214304_seed_rbac_table";
import {up as seedOrderServicePermissions} from "../../src/migrations/20261022173627_seed_order_service_permissions";
import {up as seedAnalyticsPermissions} from "../../src/migrations/20261028180000_seed_analytics_service_permissions";

// Migration bookkeeping + the migration-seeded RBAC catalog survive truncation
// so the test DB keeps looking like a freshly migrated one (rbac() middleware
// and member creation resolve roles/permissions from these tables).
const PRESERVED_TABLES = new Set(["knex_migrations", "knex_migrations_lock", "roles", "permissions", "role_permissions"]);

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
     WHERE schemaname = 'public'`,
  );
  const tableNames = result.rows
      .map((r) => r.table_name)
      .filter((t) => !PRESERVED_TABLES.has(t) && t !== "spatial_ref_sys") // spatial_ref_sys belongs to PostGIS
      .map((t) => `"${t}"`)
      .join(", ");
  if (tableNames) await db.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
}

/**
 * PostGIS keeps its SRID catalog in public.spatial_ref_sys. An older
 * truncateAll wiped it, which breaks every geography query (ST_DWithin →
 * "Cannot find SRID (4326)"). Restores the one SRID this schema uses
 * (`geography(Point, 4326)`); no-op when the row is already there.
 */
export async function restorePostgisSrid(): Promise<void> {
  assertTestDatabase(env.db.name);
  await db.raw(`
    INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
    VALUES (4326, 'EPSG', 4326,
      'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',
      '+proj=longlat +datum=WGS84 +no_defs ')
    ON CONFLICT (srid) DO NOTHING;
  `);
}

/**
 * Re-applies the RBAC seed migrations. They are `ON CONFLICT DO NOTHING`, so
 * this is a no-op on a fresh DB and repairs a DB whose catalog was wiped by an
 * older truncateAll that did not preserve the RBAC tables.
 */
export async function seedRbacCatalog(): Promise<void> {
  assertTestDatabase(env.db.name);
  await seedRbac(db);
  await seedOrderServicePermissions(db);
  await seedAnalyticsPermissions(db);
}
