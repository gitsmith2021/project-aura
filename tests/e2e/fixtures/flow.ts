// Arch A2 / Step 3 — shared helpers for the critical user-flow e2e specs.
// Flow specs drive real workflows across roles, so they open their own browser
// contexts per role (browser.newContext({ storageState })) rather than relying
// on a single project-level session.

import fs from "fs";
import path from "path";
import type { SeedManifest } from "./route-map.mjs";

const AUTH_DIR = path.join(process.cwd(), "tests", "e2e", ".auth");

/** storageState path for a seeded role fixture (super/admin/hod/staff/student/parent). */
export const authFile = (key: string): string => path.join(AUTH_DIR, `${key}.json`);

/** Seed id manifest (written by `npm run seed:e2e`). Throws if absent so the
 *  failure message points at the missing seed rather than a cryptic undefined. */
export function loadManifest(): SeedManifest {
  const p = path.join(AUTH_DIR, "seed-manifest.json");
  if (!fs.existsSync(p)) {
    throw new Error("seed manifest missing — run `npm run seed:e2e` before the authed e2e suite.");
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as SeedManifest;
}

/** A short unique tag for namespacing rows a flow creates (so each run is findable). */
export const runTag = (): string => `e2e-${Date.now().toString(36)}`;
