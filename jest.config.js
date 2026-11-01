/**
 * Unit tests: pure functions / middleware only — no DB, Redis, broker or network.
 * Run with `npm test`.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/unit"],
  testMatch: ["**/*.test.ts", "**/*.unit.ts"],
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  transform: {
    // 151002: ts-jest warns about `module: nodenext` (from tsconfig.json);
    // the package has no "type": "module", so it compiles to CommonJS anyway.
    "^.+\\.ts$": ["ts-jest", {tsconfig: "tsconfig.test.json", diagnostics: {ignoreCodes: [151002]}}],
  },
};
