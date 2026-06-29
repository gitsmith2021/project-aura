// CF-3 v2 — embeddings edge function (Deno / Supabase Edge Runtime).
//
// Generates 384-dim `gte-small` embeddings for the Aura Intelligence semantic
// catalog — free, in-stack (Anthropic has no embeddings endpoint). Custom-
// authenticated: only callers presenting the project's service role key (as the
// app's `embedText()` does) may invoke it, so `verify_jwt` is off but the endpoint
// is not open. Non-sensitive — it only embeds caller-supplied text.
//
// Deploy:  supabase functions deploy embed   (or via the Supabase MCP)
// This directory is excluded from the web tsconfig + ESLint (separate Deno runtime).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const session = new Supabase.ai.Session("gte-small");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  const auth = req.headers.get("Authorization") ?? "";
  if (!SERVICE_KEY || auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "Provide { input: string }" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const embedding = await session.run(input, { mean_pool: true, normalize: true });
    return new Response(JSON.stringify({ embedding }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
