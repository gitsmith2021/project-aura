// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — Executive Summary (grounded). Builds 1–2 sentences using ONLY the
// authoritative numbers already in the composed blocks — never invents figures.
// The LLM (llm.refineSummary) may polish the prose, still bound to these facts.
// Pure + tested.
// ════════════════════════════════════════════════════════════════════════════

import type { ComposedView, ComputedKpi } from "./types";

const kget = (kpis: ComputedKpi[], match: RegExp) => kpis.find((k) => match.test(k.label));

/** Deterministic, data-grounded summary for a composed answer. */
export function buildSummary(view: ComposedView): string {
  if (view.empty) return "There's no data for that yet — once records exist, this answer will populate.";

  const kpiStrip = view.blocks.find((b) => b.kind === "kpiStrip");
  const grid = view.blocks.find((b) => b.kind === "recordGrid");
  const chart = view.blocks.find((b) => b.kind === "chart");
  const kpis = kpiStrip && kpiStrip.kind === "kpiStrip" ? kpiStrip.kpis : [];

  switch (view.responseType) {
    case "LIST": {
      const total = grid?.kind === "recordGrid" ? grid.total : (kget(kpis, /^total/i)?.value ?? 0);
      const avg = kget(kpis, /average/i)?.display;
      const lo = kget(kpis, /lowest/i)?.display;
      const hi = kget(kpis, /highest/i)?.display;
      let s = `${Number(total).toLocaleString("en-IN")} ${total === 1 ? "record matches" : "records match"} your criteria.`;
      if (avg && lo && hi) s += ` They average ${avg}, ranging from ${lo} to ${hi}.`;
      return s;
    }
    case "KPI": {
      const main = kpis[0];
      return main ? `${main.label}: ${main.display}.` : "Here is the figure you asked for.";
    }
    case "DISTRIBUTION": {
      if (chart?.kind === "chart" && chart.widget.rows.length) {
        const top = chart.widget.rows[0];
        const cat = chart.widget.category ? String(top[chart.widget.category]) : "";
        const val = chart.widget.value ? Number(top[chart.widget.value]).toLocaleString("en-IN") : "";
        return `Distribution shown across ${chart.widget.rows.length} groups — ${cat} leads with ${val}.`;
      }
      return "Here is the distribution you asked for.";
    }
    case "TREND": {
      if (chart?.kind === "chart" && chart.widget.rows.length >= 2) {
        const r = chart.widget.rows, v = chart.widget.value!;
        const first = Number(r[0][v]), last = Number(r[r.length - 1][v]);
        const dir = last > first ? "risen" : last < first ? "fallen" : "held steady";
        return `Across ${r.length} periods the trend has ${dir}, ending at ${last.toLocaleString("en-IN")}.`;
      }
      return "Here is the trend over time.";
    }
    case "COMPARISON": {
      const withDelta = kpis.find((k) => k.delta && k.delta.pct !== null);
      if (withDelta?.delta) return `${withDelta.label} is ${withDelta.delta.pct! >= 0 ? "up" : "down"} ${Math.abs(withDelta.delta.pct!)}% ${withDelta.delta.label}.`;
      return "Here is the period-over-period comparison.";
    }
    default:
      return kpis.length ? `${kpis[0].label}: ${kpis[0].display}.` : "Here is your institution overview.";
  }
}
