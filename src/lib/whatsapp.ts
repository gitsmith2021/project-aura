// Phase 3C — WhatsApp delivery (STUB).
//
// Meta WhatsApp Cloud API needs a verified Meta Business account, a registered
// phone number, and pre-approved message templates — deferred. This stub keeps
// the seam: triggers can call sendWhatsApp() today and it logs instead of
// sending. Swap the body for the Cloud API call once WHATSAPP_TOKEN /
// WHATSAPP_PHONE_NUMBER_ID and approved templates exist.

type WhatsAppResult = { success: true } | { success: false; error: string } | { skipped: true };

export async function sendWhatsApp(args: {
  to: string;
  template: string;
  variables?: Record<string, string>;
}): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    console.warn(`[whatsapp:stub] would send template "${args.template}" to ${args.to}`);
    return { skipped: true };
  }
  // TODO(3C): POST to graph.facebook.com /<phone_number_id>/messages with the
  // approved template + variables here.
  console.warn("[whatsapp] WHATSAPP_TOKEN set but Cloud API integration not implemented yet.");
  return { skipped: true };
}
