import type {Knex} from "knex";

/**
 * Seed of the full order-service RBAC catalog (see order-service docs/business-logic/rbac.md).
 *
 * Extend this catalog freely in later migrations (new permissions or new role
 * mappings). The `ON CONFLICT DO NOTHING` clauses make re-seeding safe.
 *
 *   Resources:  orders | payments | deliveries | finance
 *   Roles:      owner | branch_manager | staff  (system_admin bypasses RBAC)
 *
 *   payments:refund and finance:payout_create are admin-bypassed today (per docs),
 *   seeded here so non-admin roles can be granted them later without a code change.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        INSERT INTO permissions (resource, action, created_at) VALUES
            ('orders',     'read',          NOW()),
            ('orders',     'accept',        NOW()),
            ('orders',     'update',        NOW()),
            ('orders',     'cancel',        NOW()),
            ('payments',   'read',          NOW()),
            ('payments',   'refund',        NOW()),
            ('deliveries', 'assign',        NOW()),
            ('finance',    'read',          NOW()),
            ('finance',    'payout_create', NOW())
        ON CONFLICT (resource, action) DO NOTHING;
    `);

    // owner → every permission in this catalog.
    await knex.raw(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, NOW()
        FROM roles r, permissions p
        WHERE r.name = 'owner'
          AND p.resource IN ('orders','payments','deliveries','finance')
        ON CONFLICT DO NOTHING;
    `);

    // branch_manager → all orders:* + finance:read.
    await knex.raw(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, NOW()
        FROM roles r, permissions p
        WHERE r.name = 'branch_manager'
          AND (
              p.resource = 'orders'
              OR (p.resource = 'finance' AND p.action = 'read')
          )
        ON CONFLICT DO NOTHING;
    `);

    // staff → orders:read | orders:update | orders:accept only.
    await knex.raw(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, NOW()
        FROM roles r, permissions p
        WHERE r.name = 'staff'
          AND p.resource = 'orders'
          AND p.action IN ('read','update','accept')
        ON CONFLICT DO NOTHING;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions
            WHERE resource IN ('orders','payments','deliveries','finance')
        );
        DELETE FROM permissions
        WHERE resource IN ('orders','payments','deliveries','finance');
    `);
}
