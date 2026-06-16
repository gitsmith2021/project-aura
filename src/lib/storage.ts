// Supabase Storage helpers (client-side upload + public URL).
//
// Buckets are created manually in the dashboard (matches the `receipts` /
// `purchase-invoices` convention). For admissions: create a public bucket
// named `admissions-documents`.

import { createClient } from "@/utils/supabase/client";

/** Upload a file under `prefix/<uuid>.<ext>` and return its public URL. */
export async function uploadDocument(
  bucket: string,
  file: File,
  prefix: string
): Promise<{ success: true; url: string; name: string } | { success: false; error: string }> {
  try {
    const sb = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, file);
    if (error) return { success: false, error: error.message };
    const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
    return { success: true, url: publicUrl, name: file.name };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export function getDocumentUrl(bucket: string, path: string): string {
  const sb = createClient();
  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
