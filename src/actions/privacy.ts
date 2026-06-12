"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  BANNER_CONSENT_TYPES,
  CONSENT_TYPE_META,
  type ConsentType,
} from "@/lib/dataRetention";

export type ConsentLog = {
  id: string;
  institution_id: string;
  user_id: string;
  consent_type: ConsentType;
  consented: boolean;
  ip_address: string | null;
  user_agent: string | null;
  consented_at: string;
  withdrawn_at: string | null;
  // resolved client-side for the admin audit view
  user_name?: string | null;
};

export type ErasureRequest = {
  id: string;
  institution_id: string;
  requested_by: string;
  subject_type: "student" | "staff" | "parent";
  subject_id: string;
  reason: string | null;
  status: "pending" | "in_review" | "completed" | "rejected";
  admin_notes: string | null;
  requested_at: string;
  resolved_at: string | null;
  subject_name?: string | null;
};

export type ConsentStatus = {
  /** null = consent never recorded; otherwise the latest active state */
  [K in ConsentType]?: { consented: boolean; consented_at: string; withdrawn_at: string | null };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requestMeta() {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;
  const userAgent = headerList.get("user-agent");
  return { ip, userAgent };
}

/**
 * Resolve the institution the logged-in user belongs to, mirroring the login
 * fallback chain: institution_members → staff (by email) → students (by email).
 * Returns null for users with no institution (e.g. SUPER_ADMIN before any
 * institution exists) — consent capture is skipped for them.
 */
async function resolveInstitutionId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string | undefined
): Promise<string | null> {
  const { data: member } = await supabase
    .from("institution_members")
    .select("institution_id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (member?.institution_id) return member.institution_id;

  if (email) {
    const { data: staff } = await supabase
      .from("staff")
      .select("institution_id")
      .eq("email", email)
      .maybeSingle();
    if (staff?.institution_id) return staff.institution_id;

    const { data: student } = await supabase
      .from("students")
      .select("institution_id")
      .eq("email", email)
      .maybeSingle();
    if (student?.institution_id) return student.institution_id;
  }
  return null;
}

function buildConsentStatus(rows: ConsentLog[]): ConsentStatus {
  // rows must be ordered newest-first; the first row per type is current state
  const status: ConsentStatus = {};
  for (const row of rows) {
    if (!(row.consent_type in status)) {
      status[row.consent_type] = {
        consented: row.consented && !row.withdrawn_at,
        consented_at: row.consented_at,
        withdrawn_at: row.withdrawn_at,
      };
    }
  }
  return status;
}

// ── First-login banner ───────────────────────────────────────────────────────

export async function getConsentStatus(): Promise<
  | {
      success: true;
      data: {
        institutionId: string | null;
        needsConsent: boolean;
        bannerTypes: ConsentType[];
        status: ConsentStatus;
      };
    }
  | { success: false; error: string }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const institutionId = await resolveInstitutionId(supabase, user.id, user.email);
  if (!institutionId) {
    return {
      success: true,
      data: { institutionId: null, needsConsent: false, bannerTypes: [], status: {} },
    };
  }

  const { data, error } = await supabase
    .from("data_consent_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("consented_at", { ascending: false });
  if (error) return { success: false, error: error.message };

  const status = buildConsentStatus((data ?? []) as ConsentLog[]);
  const needsConsent = BANNER_CONSENT_TYPES.some(
    (t) => CONSENT_TYPE_META[t].required && !status[t]?.consented
  );

  return {
    success: true,
    data: { institutionId, needsConsent, bannerTypes: BANNER_CONSENT_TYPES, status },
  };
}

/**
 * Record the user's choice for a batch of consent types (the first-login
 * banner submits all shown types at once — declined optional consents are
 * recorded as consented: false so the choice itself is auditable).
 */
export async function recordConsents(
  choices: { consent_type: ConsentType; consented: boolean }[]
): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const missingRequired = choices.find(
    (c) => CONSENT_TYPE_META[c.consent_type].required && !c.consented
  );
  if (missingRequired) {
    return {
      success: false,
      error: `"${CONSENT_TYPE_META[missingRequired.consent_type].label}" is required to use the platform.`,
    };
  }

  const institutionId = await resolveInstitutionId(supabase, user.id, user.email);
  if (!institutionId) return { success: false, error: "No institution found for this account" };

  const { ip, userAgent } = await requestMeta();

  const { error } = await supabase.from("data_consent_logs").insert(
    choices.map((c) => ({
      institution_id: institutionId,
      user_id: user.id,
      consent_type: c.consent_type,
      consented: c.consented,
      ip_address: ip,
      user_agent: userAgent,
    }))
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Grant (or re-grant) a single consent from the portal privacy page. */
export async function recordConsent(
  consentType: ConsentType,
  consented: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  return recordConsents([{ consent_type: consentType, consented }]);
}

/** Withdraw an active consent — sets withdrawn_at on the user's open rows. */
export async function withdrawConsent(
  consentType: ConsentType
): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  if (CONSENT_TYPE_META[consentType].required) {
    return {
      success: false,
      error:
        "This consent is required to operate your account. To withdraw it, submit a data erasure request instead.",
    };
  }

  const { error } = await supabase
    .from("data_consent_logs")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("consent_type", consentType)
    .is("withdrawn_at", null);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Erasure requests (data subject side) ─────────────────────────────────────

export async function requestErasure(payload: {
  institution_id: string;
  subject_type: "student" | "staff" | "parent";
  subject_id: string;
  reason: string;
}): Promise<{ success: true; data: ErasureRequest } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // One open request at a time per subject
  const { data: open } = await supabase
    .from("data_erasure_requests")
    .select("id")
    .eq("requested_by", user.id)
    .eq("subject_id", payload.subject_id)
    .in("status", ["pending", "in_review"])
    .maybeSingle();
  if (open) return { success: false, error: "You already have an erasure request in progress." };

  const { data, error } = await supabase
    .from("data_erasure_requests")
    .insert({ ...payload, requested_by: user.id })
    .select()
    .single();
  if (error) return { success: false, error: error.message };

  revalidatePath(`/institutions/${payload.institution_id}/compliance`);
  return { success: true, data: data as ErasureRequest };
}

export async function getMyErasureRequests(): Promise<
  { success: true; data: ErasureRequest[] } | { success: false; error: string }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("data_erasure_requests")
    .select("*")
    .eq("requested_by", user.id)
    .order("requested_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ErasureRequest[] };
}

// ── Admin compliance view ────────────────────────────────────────────────────

export async function getErasureRequests(
  institutionId: string
): Promise<{ success: true; data: ErasureRequest[] } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("data_erasure_requests")
    .select("*")
    .eq("institution_id", institutionId)
    .order("requested_at", { ascending: false });
  if (error) return { success: false, error: error.message };

  const requests = (data ?? []) as ErasureRequest[];

  // Resolve subject names (no FK to students/staff — subject_id is polymorphic)
  const studentIds = requests.filter((r) => r.subject_type === "student").map((r) => r.subject_id);
  const staffIds = requests.filter((r) => r.subject_type === "staff").map((r) => r.subject_id);

  const nameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: students } = await supabase
      .from("students").select("id, full_name").in("id", studentIds);
    for (const s of students ?? []) nameById.set(s.id, s.full_name);
  }
  if (staffIds.length > 0) {
    const { data: staff } = await supabase
      .from("staff").select("id, full_name").in("id", staffIds);
    for (const s of staff ?? []) nameById.set(s.id, s.full_name);
  }

  return {
    success: true,
    data: requests.map((r) => ({ ...r, subject_name: nameById.get(r.subject_id) ?? null })),
  };
}

export async function updateErasureRequest(
  id: string,
  institutionId: string,
  status: ErasureRequest["status"],
  adminNotes: string
): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // DPDP: a refusal must carry a documented reason
  if (status === "rejected" && !adminNotes.trim()) {
    return { success: false, error: "A documented reason is required to reject an erasure request." };
  }

  const resolved = status === "completed" || status === "rejected";
  const { error } = await supabase
    .from("data_erasure_requests")
    .update({
      status,
      admin_notes: adminNotes.trim() || null,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("institution_id", institutionId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/institutions/${institutionId}/compliance`);
  return { success: true };
}

export async function getConsentLogs(
  institutionId: string
): Promise<{ success: true; data: ConsentLog[] } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("data_consent_logs")
    .select("*")
    .eq("institution_id", institutionId)
    .order("consented_at", { ascending: false })
    .limit(500);
  if (error) return { success: false, error: error.message };

  const logs = (data ?? []) as ConsentLog[];

  // user_id → display name via profiles (profiles.id === auth.users.id)
  const userIds = [...new Set(logs.map((l) => l.user_id))];
  const nameById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name").in("id", userIds);
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name);
  }

  return {
    success: true,
    data: logs.map((l) => ({ ...l, user_name: nameById.get(l.user_id) ?? null })),
  };
}

// ── Portal privacy page ──────────────────────────────────────────────────────

export async function getMyConsents(): Promise<
  { success: true; data: { status: ConsentStatus; history: ConsentLog[] } }
  | { success: false; error: string }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("data_consent_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("consented_at", { ascending: false });
  if (error) return { success: false, error: error.message };

  const history = (data ?? []) as ConsentLog[];
  return { success: true, data: { status: buildConsentStatus(history), history } };
}
