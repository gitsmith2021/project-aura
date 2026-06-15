// Phase 3C — SMS delivery (STUB).
//
// Indian transactional SMS (MSG91 / Fast2SMS) requires a paid wallet AND TRAI
// DLT registration (sender ID + per-template approval), so it's deferred. This
// stub keeps the call-site seam in place: triggers can call sendSMS() today and
// it logs instead of sending. Swap the body for the real gateway once
// SMS_API_KEY / SMS_SENDER_ID and DLT-approved templates exist.

type SmsResult = { success: true } | { success: false; error: string } | { skipped: true };

export async function sendSMS(args: { to: string; body: string }): Promise<SmsResult> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.warn(`[sms:stub] would send to ${args.to}: ${args.body.slice(0, 60)}…`);
    return { skipped: true };
  }
  // TODO(3C): integrate MSG91 / Fast2SMS with a DLT-approved template here.
  console.warn("[sms] SMS_API_KEY set but gateway integration not implemented yet.");
  return { skipped: true };
}
