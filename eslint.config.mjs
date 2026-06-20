import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The React Native / Expo app is a separate project with its own toolchain
    // and lint config — the web ESLint config must not lint it.
    "aura-mobile/**",
    // Throwaway DB-poking debug scripts at the repo root (CommonJS, not part of
    // the Next build and not imported anywhere). Kept for ad-hoc debugging but
    // out of scope for app linting.
    "test-*.js",
    "inject-live-class.js",
  ]),
  {
    rules: {
      // Honor the conventional "intentionally unused" markers: a leading
      // underscore (e.g. `_inst`, `_pfNumber`) and rest-sibling omits
      // (`const { omit, ...rest } = obj`). These are deliberate, not debt.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
]);

export default eslintConfig;
