import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Vitest — unit/integration tests for pure logic (Server Action calculation
// engines, lib helpers). Node environment by default; switch a file to jsdom
// with a `// @vitest-environment jsdom` comment when testing React components.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(here, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    reporters: "default",
  },
});
