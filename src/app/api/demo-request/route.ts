import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const DEMO_RECIPIENT = "smith.immanuel@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const { institutionName, yourName, phone, institutionType } = await req.json() as {
      institutionName: string;
      yourName: string;
      phone: string;
      institutionType: string;
    };

    await sendEmail({
      to: DEMO_RECIPIENT,
      subject: `New Demo Request — ${institutionName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8f7ff;border-radius:12px">
          <div style="background:#7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:20px">
            <h1 style="color:#fff;margin:0;font-size:18px;font-weight:900;letter-spacing:-0.3px">
              🎓 New Demo Request — AURA CAMPUS™
            </h1>
          </div>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
            <tr style="border-bottom:1px solid #f1f0f9">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;width:140px">Institution</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827">${institutionName}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f0f9">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Contact</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827">${yourName}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f0f9">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Phone</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827">${phone}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Type</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;text-transform:capitalize">${institutionType}</td>
            </tr>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center">
            Submitted via the AURA CAMPUS™ landing page demo form
          </p>
        </div>
      `,
      text: [
        "New Demo Request — AURA CAMPUS™",
        "",
        `Institution : ${institutionName}`,
        `Contact     : ${yourName}`,
        `Phone       : ${phone}`,
        `Type        : ${institutionType}`,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[demo-request]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
