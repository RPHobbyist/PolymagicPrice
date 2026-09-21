/*
 * PolymagicPrice - test runner configuration
 *
 * Scoped deliberately to the pure logic that the AI feature depends on
 * (guardrails, prompt budget, shop statistics). There is no component testing
 * setup here and none is implied.
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        setupFiles: ["./src/test/setup.ts"],
    },
});
