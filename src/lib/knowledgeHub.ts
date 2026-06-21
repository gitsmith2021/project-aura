// Phase 7X / KH-1 — Aura Knowledge Hub: pure domain model + helpers.
// No React / no Supabase — fully unit-testable (Dev Rule 18). Drives the UI
// options and client-side filtering; the DB enforces the real access via RLS.

export type KnowledgeCategory =
  | "academic" | "research" | "accreditation"
  | "administration" | "library" | "events" | "multimedia";

export type VisibilityTier = "institution" | "department" | "restricted";
export type ResourceStatus = "draft" | "published" | "archived";

export const KH_CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "academic", label: "Academics" },
  { value: "research", label: "Research" },
  { value: "accreditation", label: "Accreditation" },
  { value: "administration", label: "Administration" },
  { value: "library", label: "Library" },
  { value: "events", label: "Events & Training" },
  { value: "multimedia", label: "Multimedia" },
];

// Content types grouped by category (Knowledge Hub vision §5).
export const CONTENT_TYPES_BY_CATEGORY: Record<KnowledgeCategory, { value: string; label: string }[]> = {
  academic: [
    { value: "notes", label: "Lecture Notes" },
    { value: "presentation", label: "Presentation" },
    { value: "question_bank", label: "Question Bank" },
    { value: "lab_manual", label: "Lab Manual" },
    { value: "syllabus", label: "Syllabus" },
    { value: "reference", label: "Reference Material" },
    { value: "study_guide", label: "Study Guide" },
  ],
  research: [
    { value: "research_paper", label: "Research Paper" },
    { value: "publication", label: "Publication" },
    { value: "conference_paper", label: "Conference Paper" },
    { value: "patent", label: "Patent" },
    { value: "fdp_material", label: "FDP Material" },
    { value: "research_proposal", label: "Research Proposal" },
    { value: "project_report", label: "Project Report" },
  ],
  accreditation: [
    { value: "ssr_document", label: "SSR Document" },
    { value: "naac_evidence", label: "NAAC Evidence" },
    { value: "nba_report", label: "NBA Report" },
    { value: "iqac_record", label: "IQAC Record (AQAR)" },
    { value: "compliance_record", label: "Compliance Record" },
    { value: "best_practice", label: "Best Practice" },
    { value: "audit_report", label: "Academic Audit Report" },
  ],
  administration: [
    { value: "policy", label: "Policy" },
    { value: "circular", label: "Circular" },
    { value: "sop", label: "SOP" },
    { value: "hr_document", label: "HR Document" },
    { value: "meeting_minutes", label: "Meeting Minutes" },
    { value: "government_order", label: "Government Order" },
    { value: "form_template", label: "Form / Template" },
  ],
  library: [
    { value: "ebook", label: "eBook" },
    { value: "journal", label: "Journal" },
    { value: "digital_archive", label: "Digital Archive" },
    { value: "thesis", label: "Thesis / Dissertation" },
    { value: "reading_list", label: "Reading List" },
  ],
  events: [
    { value: "guest_lecture", label: "Guest Lecture" },
    { value: "workshop", label: "Workshop" },
    { value: "webinar", label: "Webinar" },
    { value: "fdp_program", label: "FDP Programme" },
  ],
  multimedia: [
    { value: "recorded_lecture", label: "Recorded Lecture" },
    { value: "tutorial_video", label: "Tutorial Video" },
    { value: "fdp_video", label: "FDP Video" },
    { value: "event_recording", label: "Event Recording" },
  ],
};

export const VISIBILITY_TIERS: { value: VisibilityTier; label: string; hint: string }[] = [
  { value: "institution", label: "Institution-wide", hint: "Any member of the institution can view" },
  { value: "department", label: "Department only", hint: "Department members + HODs/admins" },
  { value: "restricted", label: "Restricted", hint: "Admins and the uploader only" },
];

export const NAAC_CRITERIA: { value: string; label: string }[] = [
  { value: "1", label: "C1 — Curricular Aspects" },
  { value: "2", label: "C2 — Teaching-Learning" },
  { value: "3", label: "C3 — Research & Innovation" },
  { value: "4", label: "C4 — Infrastructure" },
  { value: "5", label: "C5 — Student Support" },
  { value: "6", label: "C6 — Governance" },
  { value: "7", label: "C7 — Institutional Values" },
];

const ALL_CONTENT_TYPES = Object.values(CONTENT_TYPES_BY_CATEGORY).flat();

export function categoryLabel(c: string): string {
  return KH_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}
export function contentTypeLabel(t: string): string {
  return ALL_CONTENT_TYPES.find((x) => x.value === t)?.label ?? t;
}
export function visibilityLabel(v: string): string {
  return VISIBILITY_TIERS.find((x) => x.value === v)?.label ?? v;
}
export function criterionLabel(c: string | null | undefined): string | null {
  if (!c) return null;
  return NAAC_CRITERIA.find((x) => x.value === c)?.label ?? `C${c}`;
}
export function contentTypesFor(category: KnowledgeCategory): { value: string; label: string }[] {
  return CONTENT_TYPES_BY_CATEGORY[category] ?? [];
}

export type ResourceLike = {
  title: string;
  category: string;
  content_type: string;
  file_url?: string | null;
  external_url?: string | null;
  department_id?: string | null;
  tags?: string[] | null;
  description?: string | null;
};

/** A resource is "link" when it points at an external URL rather than a stored file. */
export function isLinkResource(r: Pick<ResourceLike, "file_url" | "external_url">): boolean {
  return !r.file_url && !!r.external_url;
}

/** Short badge for the resource's medium (file extension or "Link"). */
export function resourceKindLabel(r: Pick<ResourceLike, "file_url" | "external_url">): string {
  if (isLinkResource(r)) return "Link";
  const url = r.file_url ?? "";
  if (!url.includes(".")) return "File";
  const ext = url.split(".").pop()?.split("?")[0]?.toUpperCase() ?? "";
  return ext && ext.length >= 1 && ext.length <= 5 ? ext : "File";
}

/** Normalise a comma/space-separated tag string into a clean unique array. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[,\n]/)) {
    const t = raw.trim().toLowerCase();
    if (t && !seen.has(t)) seen.add(t);
  }
  return Array.from(seen);
}

/** Validate an upload payload; returns an error string or null when valid. */
export function validateResource(p: ResourceLike): string | null {
  if (!p.title?.trim()) return "Title is required.";
  if (!KH_CATEGORIES.some((c) => c.value === p.category)) return "Pick a category.";
  if (!p.content_type?.trim()) return "Pick a content type.";
  if (!p.file_url && !p.external_url?.trim()) return "Attach a file or an external link.";
  return null;
}

export type ResourceFilters = {
  search?: string;
  category?: string;
  contentType?: string;
  departmentId?: string;
  naacCriterion?: string;
};

/** Client-side filtering for an already-RLS-scoped result set. */
export function matchesFilters(r: ResourceLike & { naac_criterion?: string | null }, f: ResourceFilters): boolean {
  if (f.category && r.category !== f.category) return false;
  if (f.contentType && r.content_type !== f.contentType) return false;
  if (f.departmentId && r.department_id !== f.departmentId) return false;
  if (f.naacCriterion && r.naac_criterion !== f.naacCriterion) return false;
  if (f.search) {
    const q = f.search.trim().toLowerCase();
    if (q) {
      const hay = [r.title, r.description ?? "", ...(r.tags ?? [])].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
  }
  return true;
}
