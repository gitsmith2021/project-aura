import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { tierForRole, type AccessTier, type MemberRole } from "@/lib/roles";

// Resolved identity for the signed-in user. Role detection mirrors the web app:
// prefer the institution_members row, then fall back to staff/student presence.
// Self-read RLS confirmed against the live DB:
//   staff:    profile_id = auth.uid()
//   students: id         = auth.uid()
export type Identity = {
  role: MemberRole | null;
  tier: AccessTier;
  institutionId: string | null;
  departmentId: string | null;
  fullName: string | null;
  /** staff.id when the user is a staff member, else null. */
  staffId: string | null;
  /** students.id (== auth uid) when the user is a student, else null. */
  studentId: string | null;
  /** parents.id when the user is a parent (resolved from `parents`), else null. */
  parentId: string | null;
};

type AuthState = {
  session: Session | null;
  identity: Identity | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

async function resolveIdentity(userId: string, email: string | undefined): Promise<Identity> {
  const [{ data: member }, { data: staffRow }, { data: studentRow }, { data: parentRow }] = await Promise.all([
    supabase.from("institution_members").select("role, institution_id, department_id").eq("profile_id", userId).maybeSingle(),
    supabase.from("staff").select("id, institution_id, department_id, full_name").eq("profile_id", userId).eq("is_active", true).maybeSingle(),
    supabase.from("students").select("id, institution_id, department_id, full_name").eq("id", userId).maybeSingle(),
    supabase.from("parents").select("id, institution_id, name").eq("user_id", userId).maybeSingle(),
  ]);

  const role = (member?.role as MemberRole | undefined)
    ?? (staffRow ? "STAFF" : studentRow ? "STUDENT" : null);

  // A parent has no institution_members/staff/student row — resolve them last.
  const isParent = !role && !!parentRow;

  return {
    role,
    tier: isParent ? "parent" : tierForRole(role),
    institutionId: member?.institution_id ?? staffRow?.institution_id ?? studentRow?.institution_id ?? parentRow?.institution_id ?? null,
    departmentId: member?.department_id ?? staffRow?.department_id ?? studentRow?.department_id ?? null,
    fullName: staffRow?.full_name ?? studentRow?.full_name ?? parentRow?.name ?? email ?? null,
    staffId: staffRow?.id ?? null,
    studentId: studentRow?.id ?? null,
    parentId: parentRow?.id ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setIdentity(null);
      return;
    }
    try {
      setIdentity(await resolveIdentity(s.user.id, s.user.email));
    } catch {
      setIdentity({
        role: null, tier: "student", institutionId: null, departmentId: null,
        fullName: s.user.email ?? null, staffId: null, studentId: null, parentId: null,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadIdentity(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      await loadIdentity(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadIdentity]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshIdentity = useCallback(async () => {
    await loadIdentity(session);
  }, [loadIdentity, session]);

  return (
    <AuthCtx.Provider value={{ session, identity, loading, signIn, signOut, refreshIdentity }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
