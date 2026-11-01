/**
 * Integration tests: real express app + real Postgres (quickbite_test) + real
 * Redis / RabbitMQ for the pkg clients and the outbox drain.
 * Run with `npm run test:integration`. Requires Postgres, Redis and RabbitMQ.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.integration.test.ts"],
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/integration/teardown.ts",
  // One shared test DB: files must not truncate under each other.
  maxWorkers: 1,
  forceExit: true,
  // bcrypt + broker round-trips need more than the 5s default.
  testTimeout: 15000,
  transform: {
    // 151002: see jest.config.js
    "^.+\\.ts$": ["ts-jest", {tsconfig: "tsconfig.test.json", diagnostics: {ignoreCodes: [151002]}}],
    // promise-breaker@7 (pulled in by amqp-connection-manager) ships ESM only;
    // Node 24 can require() it, but Jest's module runtime cannot — transpile it to CJS.
    "node_modules[\\\\/]promise-breaker[\\\\/].+\\.js$": [
      "ts-jest",
      {tsconfig: {allowJs: true, module: "commonjs", moduleResolution: "node", isolatedModules: true}, diagnostics: false},
    ],
  },
  transformIgnorePatterns: ["[\\\\/]node_modules[\\\\/](?!promise-breaker[\\\\/])"],
};
