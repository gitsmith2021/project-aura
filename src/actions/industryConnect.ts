"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  interactionRollup, naacMouCsv, expiryUrgency,
  type PartnerType, type InteractionType, type NaacMouRow, type ExpiryUrgency,
} from "@/lib/industryConnect";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MouRow = {
  id: string; partnerName: string; partnerType: PartnerType; mouDate: string; validityYears: number;
  expiryDate: string; purpose: string; contactPerson: string | null; contactEmail: string | null;
  mouDocumentUrl: string | null; isActive: boolean; activities: string[];
  activityCount: number; studentsBenefited: number;
};

export type InteractionRow = {
  id: string; mouPartnerId: string | null; partnerName: string | null; interactionType: InteractionType;
  title: string; date: string; studentsBenefited: number | null; description: string | null;
};

export type ExpiryAlert = { id: string; partnerName: string; expiryDate: string; urgency: Extract<ExpiryUrgency, "critical" | "warning" | "expired"> };

// ── MOUs ──────────────────────────────────────────────────────────────────────

export async function getMOUs(institutionId: string): Promise<Result<MouRow[]>> {
  try {
    const supabase = await db();
    const [{ data: partners, error }, { data: interactions }] = await Promise.all([
      supabase.from("mou_partners").select("id, partner_name, partner_type, mou_date, validity_years, expiry_date, purpose, contact_person, contact_email, mou_document_url, is_active, activities").eq("institution_id", institutionId).order("expiry_date"),
      supabase.from("industry_interactions").select("mou_partner_id, students_benefited").eq("institution_id", institutionId),
    ]);
    if (error) return { success: false, error: error.message };
    const roll = interactionRollup((interactions ?? []).map((i) => ({ mou_partner_id: (i.mou_partner_id as string | null) ?? null, students_benefited: (i.students_benefited as number | null) ?? null })));
    const rows: MouRow[] = (partners ?? []).map((p) => {
      const r = roll.get(p.id as string) ?? { count: 0, students: 0 };
      return {
        id: p.id as string,
        partnerName: p.partner_name as string,
        partnerType: p.partner_type as PartnerType,
        mouDate: p.mou_date as string,
        validityYears: p.validity_years as number,
        expiryDate: p.expiry_date as string,
        purpose: p.purpose as string,
        contactPerson: (p.contact_person as string | null) ?? null,
        contactEmail: (p.contact_email as string | null) ?? null,
        mouDocumentUrl: (p.mou_document_url as string | null) ?? null,
        isActive: !!p.is_active,
        activities: Array.isArray(p.activities) ? (p.activities as string[]) : [],
        activityCount: r.count,
        studentsBenefited: r.students,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function saveMOU(input: {
  institutionId: string; id?: string | null; partnerName: string; partnerType: PartnerType;
  mouDate: string; validityYears: number; expiryDate: string; purpose: string;
  activities: string[]; contactPerson?: string | null; contactEmail?: string | null; mouDocumentUrl?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.partnerName.trim()) return { success: false, error: "Partner name is required." };
    if (!input.purpose.trim()) return { success: false, error: "Purpose is required." };
    if (!input.mouDate || !input.expiryDate) return { success: false, error: "MOU and expiry dates are required." };
    const supabase = await db();
    const payload = {
      institution_id: input.institutionId,
      partner_name: input.partnerName.trim(),
      partner_type: input.partnerType,
      mou_date: input.mouDate,
      validity_years: input.validityYears,
      expiry_date: input.expiryDate,
      purpose: input.purpose.trim(),
      activities: input.activities,
      contact_person: input.contactPerson?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      mou_document_url: input.mouDocumentUrl || null,
    };
    if (input.id) {
      const { error } = await supabase.from("mou_partners").update(payload).eq("id", input.id);
      if (error) return { success: false, error: error.message };
      revalidatePath(`/institutions/${input.institutionId}/industry-connect`);
      return { success: true, data: { id: input.id } };
    }
    const { data, error } = await supabase.from("mou_partners").insert(payload).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/industry-connect`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function toggleMOUActive(input: { institutionId: string; id: string; isActive: boolean }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("mou_partners").update({ is_active: input.isActive }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/industry-connect`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteMOU(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("mou_partners").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/industry-connect`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Interactions ──────────────────────────────────────────────────────────────

export async function getInteractions(institutionId: string): Promise<Result<InteractionRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("industry_interactions")
      .select("id, mou_partner_id, interaction_type, title, date, students_benefited, description, mou_partners(partner_name)")
      .eq("institution_id", institutionId)
      .order("date", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: InteractionRow[] = (data ?? []).map((i) => ({
      id: i.id as string,
      mouPartnerId: (i.mou_partner_id as string | null) ?? null,
      partnerName: (i.mou_partners as unknown as { partner_name: string } | null)?.partner_name ?? null,
      interactionType: i.interaction_type as InteractionType,
      title: i.title as string,
      date: i.date as string,
      studentsBenefited: (i.students_benefited as number | null) ?? null,
      description: (i.description as string | null) ?? null,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function logInteraction(input: {
  institutionId: string; id?: string | null; mouPartnerId?: string | null; interactionType: InteractionType;
  title: string; date: string; studentsBenefited?: number | null; description?: string | null;
}): Promise<Result<null>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Title is required." };
    if (!input.date) return { success: false, error: "Date is required." };
    const supabase = await db();
    const payload = {
      institution_id: input.institutionId,
      mou_partner_id: input.mouPartnerId || null,
      interaction_type: input.interactionType,
      title: input.title.trim(),
      date: input.date,
      students_benefited: input.studentsBenefited ?? null,
      description: input.description?.trim() || null,
    };
    const { error } = input.id
      ? await supabase.from("industry_interactions").update(payload).eq("id", input.id)
      : await supabase.from("industry_interactions").insert(payload);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/industry-connect/interactions`);
    revalidatePath(`/institutions/${input.institutionId}/industry-connect`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteInteraction(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("industry_interactions").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/industry-connect/interactions`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── NAAC 7.1 export ───────────────────────────────────────────────────────────

export async function getNaacMouCsv(institutionId: string): Promise<Result<{ csv: string }>> {
  try {
    const res = await getMOUs(institutionId);
    if (!res.success) return res;
    const today = new Date();
    const rows: NaacMouRow[] = res.data.map((m) => {
      const u = expiryUrgency(m.expiryDate, today);
      return {
        partner_name: m.partnerName,
        partner_type: m.partnerType,
        mou_date: m.mouDate,
        expiry_date: m.expiryDate,
        purpose: m.purpose,
        activityCount: m.activityCount,
        studentsBenefited: m.studentsBenefited,
        status: !m.isActive ? "Inactive" : u === "expired" ? "Expired" : "Active",
      };
    });
    return { success: true, data: { csv: naacMouCsv(rows) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
