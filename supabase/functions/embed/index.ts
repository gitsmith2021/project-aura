// CF-3 v2 — embeddings edge function (Deno / Supabase Edge Runtime).
//
// Generates 384-dim embeddings with the in-stack `gte-small` model — free, no
// external paid API (Anthropic has no embeddings endpoint). Used by the
// `buildSemanticIndex` action and the optional vector-resolution tier. Deploy:
//   supabase functions deploy embed
// then set SUPABASE_EMBED_URL to its public URL for the app to use it.
//
// Runs on the Deno Edge Runtime — `Supabase` and `Deno` are Deno globals. This
// directory is excluded from the web tsconfig + ESLint (separate runtime), so the
// Deno-only globals below are expected to be unknown to the Next.js toolchain.

// deno-lint-ignore-file
declare const Supabase: { ai: { Session: new (m: string) => { run: (i: string, o: Record<string, unknown>) => Promise<number[]> } } };
declare const Deno: { serve: (h: (req: Request) => Promise<Response>) => void };

const session = new Supabase.ai.Session("gte-small");

Deno.serve(async (req: Request) => {
  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "Provide { input: string }" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    const embedding = await session.run(input, { mean_pool: true, normalize: true });
    return new Response(JSON.stringify({ embedding }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
