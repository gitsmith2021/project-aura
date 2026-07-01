import { NextResponse } from "next/server";
import { getExecutiveFromBearer, executiveTokenClient } from "@/lib/executiveMobileAuth";
import { runPipeline } from "@/lib/intelligence/pipeline";

// Phase 8 (P8.1) — Aura Intelligence (CF-3) for the executive mobile app.
// The mobile client sends the user's JWT; we run the SAME pipeline as the web
// askAura under a token-scoped (RLS) client and return only the answer (the
// trace is dev-only). No SQL is generated; CF-2 / RLS unchanged.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { institutionId?: string; question?: string } | null;
  if (!body?.institutionId || !body?.question?.trim()) {
    return NextResponse.json({ error: "institutionId and question are required." }, { status: 400 });
  }

  const ctx = await getExecutiveFromBearer(req, body.institutionId);
  if (!ctx) return NextResponse.json({ error: "Not authorised for Aura Intelligence." }, { status: 401 });

  const client = executiveTokenClient(req);
  if (!client) return NextResponse.json({ error: "Auth unavailable." }, { status: 500 });

  try {
    const { answer, trace } = await runPipeline(client, ctx, body.question);
    // Best-effort log (feeds /admin/dev/ai-metrics); RLS allows the owner to insert.
    await client.from("intelligence_queries").insert({
      institution_id: ctx.institutionId, user_id: ctx.userId, role: ctx.role, question: body.question,
      intent_id: answer.ok ? answer.intentId : null,
      response_type: answer.ok ? answer.view.responseType : answer.reason,
      confidence: trace.overallConfidence, latency_ms: trace.totalMs, path: trace.path,
    }).then(() => {}, () => {});
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong." }, { status: 500 });
  }
}
