"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { aggregateSSRData } from "@/actions/ssrBuilder";
import { getIqacStats } from "@/actions/iqacMeetings";
import { meetingStats, actionStats, type MeetingStatus, type ActionStatus, type MeetingStats, type ActionStats } from "@/lib/iqac";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

export type CriterionSummary = { number: number; title: string; completeness: number; liveWithData: number; total: number };

export type IqacOverview = {
  overallCompleteness: number;
  criteria: CriterionSummary[];
  meetings: MeetingStats;
  actions: ActionStats;
};

/** IQAC dashboard: NAAC criterion completeness (reuses the SSR aggregator) + meeting/action health. */
export async function getIqacOverview(institutionId: string): Promise<Result<IqacOverview>> {
  try {
    const [ssr, stats] = await Promise.all([aggregateSSRData(institutionId), getIqacStats(institutionId)]);
    if (!ssr.success) return { success: false, error: ssr.error };
    const criteria: CriterionSummary[] = ssr.data.criteria.map((c) => ({
      number: c.number, title: c.title, completeness: c.completeness,
      liveWithData: c.liveWithData, total: c.sources.length,
    }));
    return {
      success: true,
      data: {
        overallCompleteness: ssr.data.overallCompleteness,
        criteria,
        meetings: stats.success ? stats.data.meetings : meetingStats([]),
        actions: stats.success ? stats.data.actions : actionStats([]),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── AQAR (Annual Quality Assurance Report) ────────────────────────────────────

export type AqarData = {
  yearLabel: string | null;
  overallCompleteness: number;
  criteria: CriterionSummary[];
  meetings: MeetingStats;
  actions: ActionStats;
  students: number;
  staff: number;
};

export async function getAqar(institutionId: string, academicYearId: string | null): Promise<Result<AqarData>> {
  try {
    const supabase = await db();
    const ssr = await aggregateSSRData(institutionId);
    if (!ssr.success) return { success: false, error: ssr.error };

    // Year-scoped meeting + action stats (fall back to all when no year chosen).
    let meetingsQ = supabase.from("iqac_meetings").select("id, status").eq("institution_id", institutionId);
    if (academicYearId) meetingsQ = meetingsQ.eq("academic_year_id", academicYearId);
    const { data: meetings } = await meetingsQ;
    const meetingIds = (meetings ?? []).map((m) => m.id as string);
    let actions: { status: string }[] = [];
    if (meetingIds.length > 0) {
      const { data } = await supabase.from("iqac_action_items").select("status").in("meeting_id", meetingIds);
      actions = (data ?? []) as { status: string }[];
    }

    const [{ count: students }, { count: staff }, yearRow] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", institutionId).eq("is_active", true),
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("institution_id", institutionId).eq("is_active", true),
      academicYearId ? supabase.from("academic_years").select("label").eq("id", academicYearId).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    return {
      success: true,
      data: {
        yearLabel: (yearRow.data?.label as string | undefined) ?? null,
        overallCompleteness: ssr.data.overallCompleteness,
        criteria: ssr.data.criteria.map((c) => ({ number: c.number, title: c.title, completeness: c.completeness, liveWithData: c.liveWithData, total: c.sources.length })),
        meetings: meetingStats((meetings ?? []).map((m) => ({ status: m.status as MeetingStatus }))),
        actions: actionStats(actions.map((a) => ({ status: a.status as ActionStatus }))),
        students: students ?? 0,
        staff: staff ?? 0,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
