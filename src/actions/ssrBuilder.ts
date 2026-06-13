"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { SSR_CRITERIA, type SSRCriterion, type SSREvidenceSource } from "@/lib/ssrRegistry";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7F-sub — NAAC SSR Builder: evidence aggregation & completeness.
//
// Counts evidence rows per registry source with head-only COUNT queries (no
// rows transferred, no PostgREST row caps). Uses the caller's cookie client —
// RLS already scopes every table to the caller's institutions, so this needs
// no service role and is safe for INST_ADMIN / HOD users.
//
// Completeness definition (shown verbatim in the UI):
//   criterion completeness = live sources with ≥1 evidence row
//                          ÷ ALL mapped sources (pending modules included).
// Pending modules count against readiness on purpose — NAAC will ask for
// that evidence whether or not Aura has shipped the module yet.
// ─────────────────────────────────────────────────────────────────────────────

export type SSREvidenceCount = SSREvidenceSource & {
  /** null for pending sources (nothing to count yet). */
  count: number | null;
};

export type SSRCriterionReport = Omit<SSRCriterion, "sources"> & {
  sources: SSREvidenceCount[];
  liveWithData: number;
  liveEmpty: number;
  pendingModules: number;
  /** 0–100, per the definition above. */
  completeness: number;
};

export type SSRReport = {
  criteria: SSRCriterionReport[];
  /** 0–100 across all criteria (same definition, all sources pooled). */
  overallCompleteness: number;
  generatedAt: string;
};

export async function aggregateSSRData(institutionId: string): Promise<
  | { success: true; data: SSRReport }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Guard: only members of this institution get a report (RLS would return
    // zeros rather than erroring, which would read as "0% ready" — misleading).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };
    const { data: membership } = await supabase
      .from("institution_members")
      .select("id")
      .eq("profile_id", user.id)
      .or(`institution_id.eq.${institutionId},role.eq.SUPER_ADMIN`)
      .limit(1)
      .maybeSingle();
    if (!membership) return { success: false, error: "You are not a member of this institution." };

    const countSource = async (source: SSREvidenceSource): Promise<number | null> => {
      if (source.status !== "live" || !source.table || !source.column) return null;
      if (source.column === "join:attendance") {
        const { count, error } = await supabase
          .from("attendance")
          .select("id, class_schedules!inner(departments!inner(institution_id))", { count: "exact", head: true })
          .eq("class_schedules.departments.institution_id", institutionId);
        if (error) throw new Error(`${source.table}: ${error.message}`);
        return count ?? 0;
      }
      const { count, error } = await supabase
        .from(source.table)
        .select("*", { count: "exact", head: true })
        .eq(source.column, institutionId);
      if (error) throw new Error(`${source.table}: ${error.message}`);
      return count ?? 0;
    };

    const criteria: SSRCriterionReport[] = await Promise.all(
      SSR_CRITERIA.map(async (criterion) => {
        const sources: SSREvidenceCount[] = await Promise.all(
          criterion.sources.map(async (source) => ({ ...source, count: await countSource(source) }))
        );
        const liveWithData = sources.filter((s) => s.status === "live" && (s.count ?? 0) > 0).length;
        const liveEmpty = sources.filter((s) => s.status === "live" && (s.count ?? 0) === 0).length;
        const pendingModules = sources.filter((s) => s.status === "pending").length;
        return {
          number: criterion.number,
          title: criterion.title,
          description: criterion.description,
          sources,
          liveWithData,
          liveEmpty,
          pendingModules,
          completeness: sources.length > 0 ? Math.round((liveWithData / sources.length) * 100) : 0,
        };
      })
    );

    const allSources = criteria.reduce((sum, c) => sum + c.sources.length, 0);
    const allWithData = criteria.reduce((sum, c) => sum + c.liveWithData, 0);

    return {
      success: true,
      data: {
        criteria,
        overallCompleteness: allSources > 0 ? Math.round((allWithData / allSources) * 100) : 0,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
