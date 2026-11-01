module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/unit"],
  testMatch: ["**/*.test.ts", "**/*.unit.ts"],
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
}