"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type HostelAnnouncement = {
  id: string; hostel_id: string; title: string; body: string; posted_by: string | null; created_at: string;
};

export async function getHostelAnnouncements(hostelId: string): Promise<Result<HostelAnnouncement[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("hostel_announcements").select("id, hostel_id, title, body, posted_by, created_at")
      .eq("hostel_id", hostelId).order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as HostelAnnouncement[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function postHostelAnnouncement(input: {
  hostelId: string; institutionId: string; title: string; body: string;
}): Promise<Result<HostelAnnouncement>> {
  try {
    if (!input.title.trim() || !input.body.trim()) return { success: false, error: "Title and message are required." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("hostel_announcements")
      .insert({ hostel_id: input.hostelId, title: input.title.trim(), body: input.body.trim(), posted_by: user.id })
      .select("id, hostel_id, title, body, posted_by, created_at")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/hostels/${input.hostelId}/announcements`);
    return { success: true, data: data as unknown as HostelAnnouncement };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteHostelAnnouncement(id: string, hostelId: string, institutionId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("hostel_announcements").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/hostels/${hostelId}/announcements`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
