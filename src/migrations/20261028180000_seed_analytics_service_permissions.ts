import type {Knex} from "knex";

/**
 * Seed of the analytics-service RBAC catalog (see analytics-service CLAUDE.md §8 RBAC).
 *
 * analytics-service has no permissions catalog of its own: it resolves a
 * restaurantRole's permissions through GET /api/internal/rbac/permissions and
 * gates its read endpoints on `analytics:read`. Same pattern as
 * 20261022173627_seed_order_service_permissions.ts.
 *
 *   Resources:  analytics
 *   Roles:      owner | branch_manager   (staff: no access; system_admin bypasses RBAC)
 *
 * `ON CONFLICT DO NOTHING` makes re-seeding safe.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        INSERT INTO permissions (resource, action, created_at) VALUES
            ('analytics', 'read', NOW())
        ON CONFLICT (resource, action) DO NOTHING;
    `);

    // owner + branch_manager → analytics:read. branch_manager is further limited
    // to its own branches by analytics-service's branch-scope guard.
    await knex.raw(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, NOW()
        FROM roles r, permissions p
        WHERE r.name IN ('owner', 'branch_manager')
          AND p.resource = 'analytics'
          AND p.action = 'read'
        ON CONFLICT DO NOTHING;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'analytics'
        );
        DELETE FROM permissions WHERE resource = 'analytics';
    `);
}
