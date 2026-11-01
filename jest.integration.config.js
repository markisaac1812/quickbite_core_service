module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*integration.test.ts", "**/*.unit.ts"],
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/integration/teardown.ts",
  maxWorkers: 1,
  forceExit: true,
  transform: {
    "^.+\\.ts$":["ts-jest", {tsconfig: "tsconfig.test.json"}]
  },

}