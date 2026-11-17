import type {Knex} from "knex";

// env.ts reads process.env once at import, so each case loads a fresh copy
// of the config with the variables it needs.
function loadConfig(vars: {NODE_ENV?: string; DB_SSL?: string}): Knex.Config {
    const saved = {NODE_ENV: process.env.NODE_ENV, DB_SSL: process.env.DB_SSL};
    for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    try {
        let config!: Knex.Config;
        jest.isolateModules(() => {
            config = require("../../../src/lib/knex/knexfile").default;
        });
        return config;
    } finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

function sslOf(config: Knex.Config) {
    return (config.connection as Knex.PgConnectionConfig).ssl;
}

describe("knexfile ssl", () => {
    it("uses TLS in production (RDS)", () => {
        // Arrange / Act
        const config = loadConfig({NODE_ENV: "production", DB_SSL: undefined});

        // Assert
        expect(sslOf(config)).toEqual({rejectUnauthorized: false});
    });

    it("stays plain outside production", () => {
        // Arrange / Act
        const config = loadConfig({NODE_ENV: "development", DB_SSL: undefined});

        // Assert
        expect(sslOf(config)).toBe(false);
    });

    it("lets DB_SSL override the default either way", () => {
        // Arrange / Act
        const prodWithoutTls = loadConfig({NODE_ENV: "production", DB_SSL: "false"});
        const devWithTls = loadConfig({NODE_ENV: "development", DB_SSL: "true"});

        // Assert
        expect(sslOf(prodWithoutTls)).toBe(false);
        expect(sslOf(devWithTls)).toEqual({rejectUnauthorized: false});
    });
});
