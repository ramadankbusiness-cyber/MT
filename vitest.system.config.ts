import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/system/**/*.test.ts"],
    clearMocks: true,
  },
});
