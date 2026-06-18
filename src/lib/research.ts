// Phase 5I — Research & Publications Management domain model + pure helpers.

export type ProjectStatus = "proposed" | "ongoing" | "completed" | "published";
export type PubType = "journal" | "conference" | "book" | "book_chapter" | "patent" | "other";

export type ResearchProject = {
  id: string;
  institution_id: string;
  title: string;
  principal_investigator: string | null;
  co_investigators: string[] | null;
  funding_agency: string | null;
  funding_amount: number | null;
  funding_spent: number | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  department_id: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
  departments?: { name: string } | null;
};

export type Publication = {
  id: string;
  institution_id: string;
  staff_id: string;
  title: string;
  pub_type: PubType;
  journal_name: string | null;
  publisher: string | null;
  pub_year: number;
  doi: string | null;
  scopus_indexed: boolean;
  ugc_listed: boolean;
  impact_factor: number | null;
  authors: string[] | null;
  document_url: string | null;
  created_at: string;
  staff?: { full_name: string; designation: string | null } | null;
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: "Proposed", ongoing: "Ongoing", completed: "Completed", published: "Published",
};
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  proposed:  "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ongoing:   "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  published: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
};
export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

export const PUB_TYPE_LABELS: Record<PubType, string> = {
  journal: "Journal", conference: "Conference", book: "Book",
  book_chapter: "Book Chapter", patent: "Patent", other: "Other",
};
export const PUB_TYPE_COLORS: Record<PubType, string> = {
  journal:      "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  conference:   "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  book:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  book_chapter: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  patent:       "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  other:        "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
export const PUB_TYPES = Object.keys(PUB_TYPE_LABELS) as PubType[];

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export type PublicationFilter = {
  type?: PubType | "all";
  year?: number | "all";
  scopusOnly?: boolean;
  ugcOnly?: boolean;
  search?: string;
};

export function filterPublications(rows: Publication[], f: PublicationFilter): Publication[] {
  const q = f.search?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (f.type && f.type !== "all" && r.pub_type !== f.type) return false;
    if (f.year && f.year !== "all" && r.pub_year !== f.year) return false;
    if (f.scopusOnly && !r.scopus_indexed) return false;
    if (f.ugcOnly && !r.ugc_listed) return false;
    if (q) {
      const hay = `${r.title} ${r.journal_name ?? ""} ${r.publisher ?? ""} ${r.staff?.full_name ?? ""} ${(r.authors ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Stats (NAAC Criterion 3 / NIRF) ───────────────────────────────────────────

export type ResearchStats = {
  activeProjects: number;     // proposed + ongoing
  completedProjects: number;  // completed + published
  totalFunding: number;       // sum sanctioned
  totalSpent: number;         // sum utilised
  totalPublications: number;
  scopusCount: number;
  ugcCount: number;
  patents: number;
};

export function researchStats(
  projects: Pick<ResearchProject, "status" | "funding_amount" | "funding_spent">[],
  publications: Pick<Publication, "pub_type" | "scopus_indexed" | "ugc_listed">[]
): ResearchStats {
  const s: ResearchStats = {
    activeProjects: 0, completedProjects: 0, totalFunding: 0, totalSpent: 0,
    totalPublications: 0, scopusCount: 0, ugcCount: 0, patents: 0,
  };
  for (const p of projects) {
    if (p.status === "proposed" || p.status === "ongoing") s.activeProjects++;
    else s.completedProjects++;
    s.totalFunding += p.funding_amount ?? 0;
    s.totalSpent += p.funding_spent ?? 0;
  }
  for (const p of publications) {
    s.totalPublications++;
    if (p.scopus_indexed) s.scopusCount++;
    if (p.ugc_listed) s.ugcCount++;
    if (p.pub_type === "patent") s.patents++;
  }
  s.totalFunding = Math.round(s.totalFunding * 100) / 100;
  s.totalSpent = Math.round(s.totalSpent * 100) / 100;
  return s;
}

export function pubsByYear(rows: Pick<Publication, "pub_year">[]): { year: number; count: number }[] {
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.pub_year, (map.get(r.pub_year) ?? 0) + 1);
  return [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
}

export type FacultyResearch = { staffId: string; name: string; publications: number; scopus: number; avgImpact: number | null };

export function publicationsByFaculty(rows: Publication[]): FacultyResearch[] {
  const map = new Map<string, { name: string; count: number; scopus: number; impacts: number[] }>();
  for (const r of rows) {
    let e = map.get(r.staff_id);
    if (!e) { e = { name: r.staff?.full_name ?? "Unknown", count: 0, scopus: 0, impacts: [] }; map.set(r.staff_id, e); }
    e.count++;
    if (r.scopus_indexed) e.scopus++;
    if (r.impact_factor != null) e.impacts.push(r.impact_factor);
  }
  return [...map.entries()]
    .map(([staffId, e]) => ({
      staffId, name: e.name, publications: e.count, scopus: e.scopus,
      avgImpact: e.impacts.length ? Math.round((e.impacts.reduce((a, b) => a + b, 0) / e.impacts.length) * 1000) / 1000 : null,
    }))
    .sort((a, b) => b.publications - a.publications);
}

// ── CSV export (NIRF Criterion 3) ──────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function publicationsCSV(rows: Publication[]): string {
  const header = ["Title", "Faculty", "Type", "Journal / Publisher", "Year", "DOI", "Scopus", "UGC-CARE", "Impact Factor"].join(",");
  const lines = rows.map((r) =>
    [
      r.title, r.staff?.full_name ?? "", PUB_TYPE_LABELS[r.pub_type],
      r.journal_name || r.publisher || "", r.pub_year, r.doi ?? "",
      r.scopus_indexed ? "Yes" : "No", r.ugc_listed ? "Yes" : "No", r.impact_factor ?? "",
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
