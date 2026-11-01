/**
 * Coverage run: executes the unit AND integration projects in one Jest
 * invocation so their coverage merges into a single report.
 * Run with `npm run test:coverage`. Requires Postgres, Redis and RabbitMQ.
 */
const unit = require("./jest.config.js");
// maxWorkers / forceExit are root-only options in a multi-project run — set below.
const {maxWorkers: _maxWorkers, forceExit: _forceExit, ...integration} = require("./jest.integration.config.js");

module.exports = {
  projects: [
    {...unit, rootDir: __dirname, displayName: "unit"},
    {...integration, rootDir: __dirname, displayName: "integration"},
  ],
  // Integration files share one test DB — never run them in parallel.
  maxWorkers: 1,
  forceExit: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/migrations/**",        // DDL, executed by globalSetup (outside instrumentation)
    "!src/server.ts",            // process entrypoints: listen + signal handlers
    "!src/worker.ts",
    "!src/lib/knex/knexfile.ts", // knex CLI config, only read by `npm run migrate`
  ],
  coverageReporters: ["text-summary", "text", "html"],
  coverageThreshold: {
    global: {statements: 80, branches: 80, functions: 80, lines: 80},
  },
};
