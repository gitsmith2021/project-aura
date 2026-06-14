// Phase 3C — transactional email delivery via Resend.
//
// Safe by default: if RESEND_API_KEY is not configured the call is a no-op that
// logs and returns { skipped: true } — so the app (and notification triggers)
// run fine before the key is added; emails simply aren't sent yet. Callers
// treat this as fire-and-forget, exactly like logAudit/notifications.

import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "AURA <onboarding@resend.dev>";

type SendArgs = { to: string | string[]; subject: string; html: string; text?: string };
type SendResult =
  | { success: true; id: string | null }
  | { success: false; error: string }
  | { skipped: true };

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${args.subject}" to ${String(args.to)}`);
    return { skipped: true };
  }
  if (!args.to || (Array.isArray(args.to) && args.to.length === 0)) {
    return { skipped: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (error) {
      console.error("[email] send failed:", error.message ?? error);
      return { success: false, error: error.message ?? "Email send failed." };
    }
    return { success: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { success: false, error: err instanceof Error ? err.message : "Email send failed." };
  }
}
