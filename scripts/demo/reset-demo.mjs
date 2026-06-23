// Phase 9B — Demo reset.
//
//   node scripts/demo/reset-demo.mjs   (or: npm run reset:demo)
//
// Tears down ONLY the demo tenant (data + auth users), then re-runs the demo seed
// to restore the pristine showcase state. Scoped strictly to slug `aura-demo` /
// `@demo.aura.test` — it can never affect production, real institutions, or e2e data.

import { makeAdmin, getDemoInstitution, cleanupDemoData, deleteDemoAuthUsers, DEMO_SLUG } from "./demo-lib.mjs";
import { seedDemo } from "./seed-demo.mjs";

async function reset() {
  const admin = makeAdmin();
  const inst = await getDemoInstitution(admin);

  if (inst) {
    // SAFETY: refuse to delete anything unless the resolved tenant IS the demo.
    if (inst.slug !== DEMO_SLUG) {
      console.error(`✗ Refusing to reset: resolved institution slug "${inst.slug}" is not "${DEMO_SLUG}".`);
      process.exit(1);
    }
    console.log("🗑  Resetting demo tenant", DEMO_SLUG, inst.id);
    await cleanupDemoData(admin, inst.id);
    await deleteDemoAuthUsers(admin);
    console.log("• demo data + demo auth users cleared");
  } else {
    console.log("• no existing demo tenant — performing a fresh seed");
  }

  await seedDemo();
  console.log("\n✅ Demo reset complete.");
}

reset().catch((e) => { console.error("✗ DEMO RESET FAILED:", e?.message || e); process.exit(1); });
