"use client";

import { useState } from "react";
import { Sparkles, X, Send, Loader2, FileText, ExternalLink } from "lucide-react";
import { askKnowledgeAssistant, type AssistantSource } from "@/actions/knowledgeAI";

// Phase 7X / KH-5 — floating Knowledge Assistant. Admin-gated (the parent only
// renders it for admins). RAG: retrieves over the Hub's full-text index, answers
// with Claude grounded in and citing those documents.
export function KnowledgeAssistantDrawer({ institutionId }: { institutionId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<AssistantSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    const q = question.trim();
    if (q.length < 3 || loading) return;
    setLoading(true); setError(null); setAnswer(null); setSources([]);
    const res = await askKnowledgeAssistant(institutionId, q);
    setLoading(false);
    if (res.success) { setAnswer(res.data.answer); setSources(res.data.sources); }
    else setError(res.error);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-violet-700 transition-colors"
        title="Ask the Knowledge Assistant"
      >
        <Sparkles size={18} /> Ask Aura
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={() => setOpen(false)}>
          <div
            className="h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600"><Sparkles size={18} /></div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Knowledge Assistant</h2>
                  <p className="text-[11px] text-slate-400">Answers from your institution&apos;s documents — with citations.</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!answer && !loading && !error && (
                <div className="text-center text-sm text-slate-400 pt-10">
                  <Sparkles size={28} className="mx-auto mb-2 text-violet-300" />
                  Ask a question like<br /><span className="text-slate-500">&ldquo;What are our policies on faculty leave?&rdquo;</span>
                </div>
              )}
              {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin text-violet-500" /> Searching the knowledge base…</div>}
              {error && <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-3 text-[13px] text-rose-600 dark:text-rose-300">{error}</div>}
              {answer && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 p-3">
                    <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{answer}</p>
                  </div>
                  {sources.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Sources</p>
                      <ul className="space-y-1.5">
                        {sources.map((s, i) => {
                          const url = s.external_url || s.file_url;
                          return (
                            <li key={s.id}>
                              <a href={url ?? undefined} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <span className="text-[11px] font-bold text-violet-600 shrink-0 mt-0.5">[{i + 1}]</span>
                                <span className="min-w-0">
                                  <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{s.title}</span>
                                  <span className="text-[11px] text-slate-400">{[s.category, s.department].filter(Boolean).join(" · ")}</span>
                                </span>
                                {s.external_url ? <ExternalLink size={13} className="text-slate-400 shrink-0 mt-0.5" /> : <FileText size={13} className="text-slate-400 shrink-0 mt-0.5" />}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                  rows={2}
                  placeholder="Ask about your institution's documents…"
                  className="flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button onClick={ask} disabled={loading || question.trim().length < 3} className="inline-flex items-center justify-center rounded-lg bg-violet-600 p-2.5 text-white hover:bg-violet-700 disabled:opacity-40">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Answers are AI-generated from your documents. Verify against the cited sources.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
