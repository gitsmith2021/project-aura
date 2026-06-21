import { describe, it, expect } from "vitest";
import {
  clamp, buildSummaryPrompt, buildAssistantContext, buildAssistantPrompt,
  extractCitedIndices, citedResources, SUMMARY_SYSTEM, ASSISTANT_SYSTEM,
  type AIResource,
} from "@/lib/knowledgeAI";

const R = (over: Partial<AIResource>): AIResource => ({
  id: "00000000-0000-0000-0000-000000000001",
  title: "Machine Learning Notes", description: "Intro to supervised learning.",
  category: "academic", content_type: "notes", tags: ["ml", "ai"],
  ai_summary: null, departments: { name: "CS" }, ...over,
});

describe("clamp", () => {
  it("leaves short text untouched and truncates long text with an ellipsis", () => {
    expect(clamp("  hi  ", 10)).toBe("hi");
    expect(clamp("abcdefghij", 5)).toBe("abcde…");
    expect(clamp("", 5)).toBe("");
  });
});

describe("buildSummaryPrompt", () => {
  it("includes title, category, department, tags and description", () => {
    const p = buildSummaryPrompt(R({}));
    expect(p).toContain("Title: Machine Learning Notes");
    expect(p).toContain("Category: academic");
    expect(p).toContain("Department: CS");
    expect(p).toContain("Tags: ml, ai");
    expect(p).toContain("Intro to supervised learning.");
  });
  it("omits optional lines when absent", () => {
    const p = buildSummaryPrompt(R({ description: null, tags: [], departments: null }));
    expect(p).not.toContain("Description:");
    expect(p).not.toContain("Tags:");
    expect(p).not.toContain("Department:");
  });
});

describe("buildAssistantContext / prompt", () => {
  it("numbers documents 1-based and prefers ai_summary over description", () => {
    const ctx = buildAssistantContext([
      R({ title: "Doc A", ai_summary: "Summary A", description: "Desc A" }),
      R({ title: "Doc B", ai_summary: null, description: "Desc B", departments: null }),
    ]);
    expect(ctx).toContain("[1] Doc A (academic · CS)");
    expect(ctx).toContain("Summary A");
    expect(ctx).not.toContain("Desc A"); // ai_summary wins
    expect(ctx).toContain("[2] Doc B (academic)");
    expect(ctx).toContain("Desc B");
  });
  it("handles the empty-retrieval case and appends the question", () => {
    expect(buildAssistantContext([])).toContain("no documents matched");
    expect(buildAssistantPrompt("What is OBE?", [])).toContain("Question: What is OBE?");
  });
});

describe("citation parsing", () => {
  it("extracts deduped 1-based indices in first-seen order", () => {
    expect(extractCitedIndices("Per [2] and [1], also [2] again.")).toEqual([2, 1]);
    expect(extractCitedIndices("no citations here")).toEqual([]);
  });
  it("maps citations to resources and ignores out-of-range indices", () => {
    const docs = [R({ id: "a", title: "A" }), R({ id: "b", title: "B" })];
    const cited = citedResources("See [2] and [5].", docs);
    expect(cited.map((r) => r.id)).toEqual(["b"]); // [5] dropped, [2] -> docs[1]
  });
});

describe("system prompts", () => {
  it("instruct the model appropriately", () => {
    expect(SUMMARY_SYSTEM).toMatch(/abstract/i);
    expect(ASSISTANT_SYSTEM).toMatch(/cite/i);
    expect(ASSISTANT_SYSTEM).toMatch(/ONLY/);
  });
});
