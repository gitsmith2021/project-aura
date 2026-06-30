import { AiLab } from "@/components/admin/AiLab";

export const dynamic = "force-dynamic";

/** CF-3.1 WS4 — Aura Intelligence Developer Lab. SUPER_ADMIN-only (the whole
 *  /admin area is gated in middleware). Inspect every pipeline stage for a
 *  question: intent, slots, semantic matches, query models, response strategy,
 *  blocks, summary, follow-ups, timings and confidence. */
export default function AiLabPage() {
  return <AiLab />;
}
