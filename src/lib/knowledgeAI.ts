// Phase 7X / KH-5 — Knowledge Hub AI layer: pure prompt/context builders and
// citation parsing. No SDK / no network here, so it is fully unit-testable
// (Dev Rule 18). The Claude calls live in src/actions/knowledgeAI.ts.

/** The resource fields the AI layer reads (structural subset of KnowledgeResource). */
export type AIResource = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_type: string;
  tags: string[];
  ai_summary?: string | null;
  departments?: { name: string } | null;
};

/** Truncate to `max` characters, appending an ellipsis when cut. */
export function clamp(text: string, max: number): string {
  const t = (text ?? "").trim();
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

export const SUMMARY_SYSTEM =
  "You write concise, discovery-friendly abstracts for an institutional knowledge repository. " +
  "Given a resource's metadata, produce a clear 2–3 sentence summary that helps a colleague decide " +
  "whether it is relevant to them. Respond with the summary only — no preamble, headings, or quotes.";

/** User prompt for the per-resource AI summary, built from the resource metadata. */
export function buildSummaryPrompt(resource: AIResource): string {
  const lines = [
    `Title: ${resource.title}`,
    `Category: ${resource.category}`,
    `Type: ${resource.content_type}`,
  ];
  if (resource.departments?.name) lines.push(`Department: ${resource.departments.name}`);
  if (resource.tags?.length) lines.push(`Tags: ${resource.tags.join(", ")}`);
  if (resource.description) lines.push(`Description: ${clamp(resource.description, 1500)}`);
  return `Summarize this knowledge resource:\n\n${lines.join("\n")}`;
}

export const ASSISTANT_SYSTEM =
  "You are the Aura Knowledge Assistant. Answer the user's question using ONLY the numbered institutional " +
  "documents provided as context. Cite every claim with the document's number in square brackets, e.g. [1] or [2]. " +
  "If the context does not contain the answer, say so plainly — do not use outside or general knowledge, and do not " +
  "guess. Keep answers concise and grounded in the cited documents.";

/** Numbered context block from the retrieved resources (1-based, matching citations). */
export function buildAssistantContext(resources: AIResource[]): string {
  if (resources.length === 0) return "(no documents matched this question)";
  return resources
    .map((r, i) => {
      const dept = r.departments?.name ? ` · ${r.departments.name}` : "";
      const body = clamp(r.ai_summary || r.description || "(no description)", 600);
      return `[${i + 1}] ${r.title} (${r.category}${dept})\n${body}`;
    })
    .join("\n\n");
}

/** Full assistant prompt: numbered context followed by the question. */
export function buildAssistantPrompt(question: string, resources: AIResource[]): string {
  return `Context documents:\n\n${buildAssistantContext(resources)}\n\nQuestion: ${question.trim()}`;
}

/** Parse the 1-based citation indices ([1], [2]…) Claude used, in first-seen order. */
export function extractCitedIndices(answer: string): number[] {
  const seen = new Set<number>();
  for (const m of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(m[1]);
    if (n > 0) seen.add(n);
  }
  return [...seen];
}

/** Map the citations in an answer back to the retrieved resources (deduped, in order). */
export function citedResources(answer: string, resources: AIResource[]): AIResource[] {
  return extractCitedIndices(answer)
    .filter((n) => n <= resources.length)
    .map((n) => resources[n - 1]);
}
