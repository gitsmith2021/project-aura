// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — deterministic slot extractor (the $0-credit floor).
//
// Parses a business question into a catalog-constrained `ExtractedQuery` WITHOUT
// an LLM: it picks the CF-2 entity, the numeric/text/date filters, group-by,
// sort, limit and the expected response type — all referencing real entity
// columns. The LLM extractor (slotExtractorLLM) produces the SAME shape with
// higher accuracy; this is the guaranteed fallback. Pure + unit-tested.
// ════════════════════════════════════════════════════════════════════════════

import type { EntityDef, FilterOperator } from "@/lib/dataExplorer";
import type { ExtractedQuery, ExtractedFilter, ResponseType } from "./types";
import { entityConfidence, slotConfidence, responseConfidence, overallConfidence } from "./confidence";

// Entity synonyms — extends the registry labels so colloquial words route correctly.
const ENTITY_SYNONYMS: Record<string, string[]> = {
  students: ["student", "students", "enrolment", "enrollment", "pupil"],
  staff: ["staff", "faculty", "teacher", "teachers", "employee", "employees", "teaching"],
  staff_salary: ["salary", "salaries", "pay", "payscale", "wage", "wages", "earning", "earnings", "drawing salary", "remuneration"],
  payroll: ["payroll", "disbursement", "disbursed", "salary paid"],
  student_attendance: ["attendance", "present", "absent", "attending", "student attendance", "students", "student"],
  fee_payments: ["fee", "fees", "collection", "payment", "payments", "paid"],
  admissions: ["admission", "admissions", "applicant", "applicants", "application", "applications", "enquiry"],
  placements: ["placement", "placements", "placed", "offer", "offers", "recruited", "ctc"],
  scholarships: ["scholarship", "scholarships", "bursary"],
  research: ["research", "publication", "publications", "paper", "papers"],
  publications: ["publication", "publications", "journal"],
  alumni: ["alumni", "alumnus", "graduate", "graduates"],
  budgets: ["budget", "budgets", "allocation"],
  expenses: ["expense", "expenses", "spending"],
  results: ["result", "results", "grade", "grades", "gpa", "marks"],
  departments: ["department", "departments", "dept"],
  iqac: ["iqac", "quality"],
  iqac_actions: ["action item", "action items", "pending action", "corrective action", "action plan"],
};

const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5 };
const NUMWORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, fifty: 50, hundred: 100 };

// NB: keep commas/periods — they're thousands separators inside amounts (₹10,000).
const norm = (s: string) => ` ${s.toLowerCase().replace(/[?_/-]/g, " ").replace(/\s+/g, " ").trim()} `;

/** Parse "₹10,000", "10000", "10k", "2 lakh", "75%" → a number. */
function parseAmount(raw: string): number | null {
  const s = raw.toLowerCase().replace(/[₹,\s]/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)(k|l|lakh|cr|crore)?$/);
  if (!m) return null;
  let n = Number(m[1]);
  if (m[2] === "k") n *= 1_000;
  else if (m[2] === "l" || m[2] === "lakh") n *= 100_000;
  else if (m[2] === "cr" || m[2] === "crore") n *= 10_000_000;
  return Number.isFinite(n) ? n : null;
}

/** Built-in synonyms MERGED with DB-managed aliases (the Semantic Catalog Manager,
 *  WS7) — so routing can be tuned without code changes. */
export type Aliases = Record<string, string[]>;

function scoreEntity(e: EntityDef, q: string, aliases: Aliases): number {
  let score = 0;
  for (const syn of [...(ENTITY_SYNONYMS[e.key] ?? []), ...(aliases[e.key] ?? [])]) if (q.includes(` ${syn} `) || q.includes(`${syn} `) || q.includes(` ${syn}`)) score += syn.includes(" ") ? 3 : 2;
  for (const w of e.label.toLowerCase().split(/\s+/)) if (w.length > 2 && q.includes(w)) score += 1;
  for (const c of e.columns) { const cl = c.label.toLowerCase(); if (cl.length > 3 && q.includes(cl)) score += 1; }
  return score;
}

export type EntityPick = { entity: EntityDef; score: number; margin: number; switched: boolean };

/** Score every entity; return the best with its margin over the runner-up (drives
 *  routing confidence). `switched` flags the salary-intent override (a heuristic). */
export function pickEntityScored(question: string, catalog: EntityDef[], aliases: Aliases = {}): EntityPick | null {
  const q = norm(question);
  const ranked = catalog.map((e) => ({ e, score: scoreEntity(e, q, aliases) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return null;
  const top = ranked[0];
  const margin = top.score - (ranked[1]?.score ?? 0);
  // Disambiguate headcount vs salary view: a salary/earning/pay question about
  // faculty/staff is about staff_salary, not the staff roster.
  if (top.e.key === "staff" && /\b(salary|salaries|earning|earnings|\bpay\b|paid|wage|wages|drawing|remuneration)\b/.test(q)) {
    const sal = catalog.find((e) => e.key === "staff_salary");
    if (sal) return { entity: sal, score: top.score, margin: 0, switched: true };
  }
  return { entity: top.e, score: top.score, margin, switched: false };
}

/** Score every entity by synonym/label/column overlap; return the best key. */
export function pickEntity(question: string, catalog: EntityDef[], aliases: Aliases = {}): EntityDef | null {
  return pickEntityScored(question, catalog, aliases)?.entity ?? null;
}

const NUM_COMPARATORS: { re: RegExp; op: FilterOperator }[] = [
  { re: /(?:less than|lower than|below|under|cheaper than|<)\s*₹?\s*([\d,.]+\s*(?:k|l|lakh|cr|crore)?|\d+)/, op: "lt" },
  { re: /(?:at most|no more than|up to|<=|≤)\s*₹?\s*([\d,.]+\s*(?:k|l|lakh|cr|crore)?|\d+)/, op: "lte" },
  { re: /(?:greater than|more than|over|above|exceeding|>)\s*₹?\s*([\d,.]+\s*(?:k|l|lakh|cr|crore)?|\d+)/, op: "gt" },
  { re: /(?:at least|no less than|>=|≥)\s*₹?\s*([\d,.]+\s*(?:k|l|lakh|cr|crore)?|\d+)/, op: "gte" },
];

/** Choose the numeric column the question is "about" (metric word → column, else primary). */
function pickNumericColumn(question: string, e: EntityDef): EntityDef["columns"][number] | null {
  const q = norm(question);
  const numCols = e.columns.filter((c) => c.type === "number");
  if (numCols.length === 0) return null;
  // metric word present in a column label?
  for (const c of numCols) {
    const words = c.label.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (words.some((w) => q.includes(w))) return c;
  }
  // common metric synonyms
  if (/\bsalary|pay|wage|earning/.test(q)) { const c = numCols.find((x) => /salary|net|basic/.test(x.key)); if (c) return c; }
  if (/\battendance|percent|%/.test(q)) { const c = numCols.find((x) => /percent|attendance|rate/.test(x.key)); if (c) return c; }
  return numCols.find((c) => c.aggregatable) ?? numCols[0];
}

/** Detect "second year", "year 2", "3rd year" → numeric year filter. */
function detectOrdinalYear(question: string, e: EntityDef): ExtractedFilter | null {
  const q = norm(question);
  const yearCol = e.columns.find((c) => c.type === "number" && /year/.test(c.key) && c.filterable);
  if (!yearCol) return null;
  for (const [word, n] of Object.entries(ORDINALS)) {
    if (q.includes(` ${word} year `) || q.includes(` year ${n} `)) return { column: yearCol.key, operator: "eq", value: n };
  }
  return null;
}

const STATUS_WORDS = ["paid", "pending", "approved", "rejected", "active", "inactive", "completed", "cancelled", "placed", "shortlisted", "admitted", "enrolled"];

/** Residual proper-noun-ish phrase (after stripping known tokens) → a text/FK filter. */
function detectTextFilter(question: string, e: EntityDef): ExtractedFilter | null {
  const q = norm(question);
  // department reference → resolve to department_id
  if (e.columns.some((c) => c.key === "department_id")) {
    const m = q.match(/\b(computer science|information technology|electronics|mechanical|civil|electrical|commerce|management|mathematics|physics|chemistry|biology|english|economics|business administration|[a-z]+ (?:science|engineering|studies))\b/);
    if (m) return { column: "department_id", operator: "eq", value: m[1], rawValue: m[1], resolve: true };
  }
  // status word → a status column (text)
  const statusCol = e.columns.find((c) => /status/.test(c.key) && c.filterable);
  if (statusCol) { const s = STATUS_WORDS.find((w) => q.includes(` ${w} `)); if (s) return { column: statusCol.key, operator: "eq", value: s }; }
  // program / course token (e.g. "MBA", "B.Sc CS")
  const progCol = e.columns.find((c) => /program|programme|course/.test(c.key) && c.filterable);
  if (progCol) { const m = q.match(/\b(mba|mca|bba|bca|b\.?sc|m\.?sc|b\.?com|m\.?com|b\.?tech|m\.?tech|ph\.?d)\b/); if (m) return { column: progCol.key, operator: "ilike", value: m[1] }; }
  return null;
}

function detectGroupBy(question: string, e: EntityDef): string | null {
  const q = norm(question);
  if (!/\bby \w|[\s-]wise|\bper \w|\beach \w/.test(q)) return null;
  // Department is the most common ask and maps to the FK column specifically.
  if (/by department|per department|department[\s-]?wise|each department/.test(q)) return e.columns.find((c) => c.key === "department_id" && c.groupable)?.key ?? null;
  // Generic: any groupable column referenced via "by X", "per X" or "X-wise"
  // (e.g. by grade, by scheme, by company, by category, by stage, by status).
  for (const col of e.columns) {
    if (!col.groupable) continue;
    const toks = new Set<string>([col.key.toLowerCase(), col.label.toLowerCase(), ...col.label.toLowerCase().split(/\s+/)]);
    for (const t of toks) {
      if (t.length < 3) continue;
      if (new RegExp(`\\bby ${t}\\b|\\bper ${t}\\b|\\b${t}[\\s-]?wise\\b`).test(q)) return col.key;
    }
  }
  return null;
}

function detectSortLimit(question: string, e: EntityDef, numericCol: EntityDef["columns"][number] | null): { sort: ExtractedQuery["sort"]; limit: number | null } {
  const q = norm(question);
  let dir: "asc" | "desc" | null = null;
  if (/\btop|highest|most|largest|maximum|best\b/.test(q)) dir = "desc";
  else if (/\bbottom|lowest|least|smallest|minimum|worst\b/.test(q)) dir = "asc";
  let limit: number | null = null;
  const m = q.match(/\b(?:top|bottom|first|last)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (m) limit = Number(m[1]) || NUMWORDS[m[1]] || null;
  const field = numericCol?.key ?? null;
  return { sort: dir && field ? { field, dir } : null, limit };
}

function detectResponseType(question: string, x: Partial<ExtractedQuery>): ResponseType {
  const q = norm(question);
  if (x.comparison) return "COMPARISON";
  if (/\btrend|over time|over the last|monthly|month on month|by month|last \d+ months\b/.test(q)) return "TREND";
  if (x.groupBy) return "DISTRIBUTION";
  if (/\bhow (?:is|are|am).*(?:doing|performing)|overview|how is my institution|dashboard|health\b/.test(q)) return "EXECUTIVE";
  if (/\b(total|how many|count|number of|sum of|average|avg)\b/.test(q) && (x.filters?.length ?? 0) === 0) return "KPI";
  return "LIST";
}

/** Title-case a metric/value for the answer heading. */
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Build a human title for the answer. */
function buildTitle(e: EntityDef, x: Partial<ExtractedQuery>): string {
  const num = x.filters?.find((f) => ["lt", "lte", "gt", "gte"].includes(f.operator));
  if (num) {
    const col = e.columns.find((c) => c.key === num.column);
    const opTxt = num.operator === "lt" ? "Below" : num.operator === "lte" ? "Up To" : num.operator === "gt" ? "Above" : "At Least";
    const isCurrency = /salary|amount|fee|pay|wage|budget|expense/.test(num.column);
    const val = isCurrency ? `₹${Number(num.value).toLocaleString("en-IN")}` : `${num.value}`;
    return `${e.label} with ${col?.label ?? "Value"} ${opTxt} ${val}`;
  }
  const ord = x.filters?.find((f) => /year/.test(f.column) && f.operator === "eq");
  const dept = x.filters?.find((f) => f.column === "department_id");
  const bits = [ord ? `${titleCase(["", "First", "Second", "Third", "Fourth", "Fifth"][Number(ord.value)] ?? "")}-Year` : "", dept ? titleCase(String(dept.rawValue ?? "")) : "", e.label].filter(Boolean);
  return bits.join(" ").trim() || e.label;
}

/** Parse a question → ExtractedQuery (or null if no entity matched). Pure. */
export function extractQuery(question: string, catalog: EntityDef[], aliases: Aliases = {}): ExtractedQuery | null {
  const pick = pickEntityScored(question, catalog, aliases);
  if (!pick) return null;
  const e = pick.entity;
  const q = norm(question);

  const filters: ExtractedFilter[] = [];
  const numericCol = pickNumericColumn(question, e);

  // numeric comparison filter
  for (const { re, op } of NUM_COMPARATORS) {
    const m = q.match(re);
    if (m && numericCol) {
      const val = parseAmount(m[1]);
      if (val !== null) { filters.push({ column: numericCol.key, operator: op, value: val }); break; }
    }
  }
  // ordinal year, text/department/status/program
  const yf = detectOrdinalYear(question, e); if (yf) filters.push(yf);
  const tf = detectTextFilter(question, e); if (tf) filters.push(tf);

  const groupBy = detectGroupBy(question, e);
  const { sort, limit } = detectSortLimit(question, e, numericCol);
  const comparison = /\bcompare|\bvs\b|versus|last year|previous (?:year|semester)|year[\s-]?on[\s-]?year\b/.test(q);

  const partial: Partial<ExtractedQuery> = { entity: e.key, filters, numericMetric: numericCol?.key ?? null, groupBy, sort, limit, comparison };
  const responseHint0 = detectResponseType(question, partial);
  // WS8 — a forecast/projection question is a trend projected forward.
  const forecast = /\bforecast|projection|projected|\bproject\b|\bpredict|next (?:\d+ )?(?:month|months|quarter|quarters|year|years)\b/.test(q);
  const responseHint = forecast && (responseHint0 === "LIST" || responseHint0 === "KPI") ? "TREND" : responseHint0;

  const out: ExtractedQuery = {
    entity: e.key,
    filters,
    numericMetric: numericCol?.key ?? null,
    groupBy,
    sort,
    limit,
    comparison,
    forecast,
    responseHint,
    title: buildTitle(e, partial),
    via: "deterministic",
  };
  const parts = { entity: entityConfidence(pick.margin, pick.switched), slots: slotConfidence(out), response: responseConfidence(out) };
  out.confidenceParts = parts;
  out.confidence = overallConfidence(parts);
  return out;
}
