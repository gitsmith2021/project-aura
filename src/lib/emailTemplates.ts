// Phase 3C — transactional email templates (pure, so they're unit-testable).
// Each returns { subject, html, text }; sendEmail() in src/lib/email.ts delivers
// them via Resend. Inline styles only — email clients ignore <style>/external CSS.

export type EmailContent = { subject: string; html: string; text: string };

const BRAND = "#7c3aed"; // violet-600
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const dateRange = (from: string, to: string) => (from === to ? from : `${from} → ${to}`);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Shared branded shell. `rows` are [label, value] pairs rendered as a table. */
function layout(opts: {
  heading: string;
  intro: string;
  rows?: [string, string][];
  outro?: string;
}): { html: string; text: string } {
  const rowsHtml = (opts.rows ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${esc(k)}</td>` +
        `<td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right">${esc(v)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
      <div style="background:${BRAND};padding:18px 24px"><span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:.5px">AURA</span></div>
      <div style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:18px;color:#0f172a">${esc(opts.heading)}</h1>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">${esc(opts.intro)}</p>
        ${rowsHtml ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:8px 0">${rowsHtml}</table>` : ""}
        ${opts.outro ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.6">${esc(opts.outro)}</p>` : ""}
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin:16px 0 0">This is an automated message from your institution's AURA portal. Please do not reply.</p>
  </div></body></html>`;

  const textRows = (opts.rows ?? []).map(([k, v]) => `${k}: ${v}`).join("\n");
  const text = [opts.heading, "", opts.intro, textRows ? `\n${textRows}` : "", opts.outro ? `\n${opts.outro}` : ""]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

export function paymentReceiptEmail(p: {
  name: string; amount: number; receiptNumber?: string | null; institutionName?: string | null;
}): EmailContent {
  const { html, text } = layout({
    heading: "Payment received",
    intro: `Hi ${p.name}, we've received your fee payment${p.institutionName ? ` at ${p.institutionName}` : ""}. Here are the details:`,
    rows: [
      ["Amount", inr(p.amount)],
      ...(p.receiptNumber ? ([["Receipt no.", p.receiptNumber]] as [string, string][]) : []),
      ["Status", "Completed"],
    ],
    outro: "Keep this email as your receipt. You can view your full payment history in the student portal.",
  });
  return { subject: `Payment received — ${inr(p.amount)}`, html, text };
}

export function leaveStatusEmail(p: {
  name: string; status: "approved" | "rejected"; leaveType: string;
  fromDate: string; toDate: string; note?: string | null;
}): EmailContent {
  const { html, text } = layout({
    heading: `Leave ${p.status}`,
    intro: `Hi ${p.name}, your leave request has been ${p.status}.`,
    rows: [
      ["Type", `${p.leaveType} leave`],
      ["Dates", dateRange(p.fromDate, p.toDate)],
      ["Decision", p.status === "approved" ? "Approved" : "Rejected"],
      ...(p.note ? ([["Note", p.note]] as [string, string][]) : []),
    ],
    outro: "You can see the full status in your staff portal.",
  });
  return { subject: `Your leave was ${p.status}`, html, text };
}

export function salaryDisbursedEmail(p: {
  name: string; month?: string | null; amount?: number | null;
}): EmailContent {
  const { html, text } = layout({
    heading: "Salary disbursed",
    intro: `Hi ${p.name}, your salary${p.month ? ` for ${p.month}` : ""} has been disbursed.`,
    rows: [
      ...(p.month ? ([["Month", p.month]] as [string, string][]) : []),
      ...(p.amount ? ([["Amount", inr(p.amount)]] as [string, string][]) : []),
      ["Status", "Processed"],
    ],
    outro: "Your detailed payslip is available in the staff portal.",
  });
  return { subject: `Salary disbursed${p.month ? ` — ${p.month}` : ""}`, html, text };
}
