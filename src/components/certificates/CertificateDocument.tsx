"use client";

import Link from "next/link";
import { Printer, ArrowLeft, ShieldAlert } from "lucide-react";
import {
  certificateTitle, certificateBody, formatLongDate, type CertContext,
} from "@/lib/certificates";
import type { CertPrintData } from "@/actions/certificates";

export function CertificateDocument({ data, backHref }: { data: CertPrintData; backHref: string }) {
  const issued = data.status === "issued";

  // Long-format the date fields before generating the prose.
  const ctx: CertContext = {
    ...data.context,
    joiningDate: data.context.joiningDate ? formatLongDate(data.context.joiningDate) : null,
    relievingDate: data.context.relievingDate ? formatLongDate(data.context.relievingDate) : null,
  };
  const body = certificateBody(data.certificateType, ctx);
  const issuedDate = formatLongDate(data.issuedAt?.slice(0, 10) ?? null);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4">
      {/* Toolbar — hidden on print */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href={backHref} className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-sky-600"><ArrowLeft size={14} /> Back</Link>
        <button onClick={() => window.print()} disabled={!issued} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {!issued && (
        <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-[12px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 print:hidden">
          <ShieldAlert size={14} /> This is a preview. The certificate can be printed once it has been issued.
        </div>
      )}

      {/* The document */}
      <div className="max-w-3xl mx-auto bg-white text-slate-900 shadow-lg print:shadow-none border border-slate-200 print:border-0">
        <div className="p-10 sm:p-14">
          {/* Letterhead */}
          <div className="text-center border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-bold tracking-tight uppercase">{ctx.institution}</h1>
            <p className="text-[11px] text-slate-500 mt-1 tracking-widest uppercase">Office of the Registrar</p>
          </div>

          {/* Ref + date */}
          <div className="flex justify-between items-start text-[12px] text-slate-600 mt-5">
            <span>Ref No: <span className="font-semibold">{data.certificateNo ?? "—"}</span></span>
            <span>Date: <span className="font-semibold">{issuedDate}</span></span>
          </div>

          {/* Title */}
          <h2 className="text-center text-lg font-bold underline underline-offset-4 mt-8 mb-6 tracking-wide">{certificateTitle(data.certificateType)}</h2>

          {/* Body */}
          <div className="space-y-4 text-[14px] leading-7 text-justify">
            {body.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {/* Signature block */}
          <div className="mt-20 flex justify-end">
            <div className="text-center">
              <div className="h-12" />
              <p className="border-t border-slate-400 pt-1 text-[13px] font-semibold px-6">Authorised Signatory</p>
              <p className="text-[11px] text-slate-500">{ctx.institution}</p>
            </div>
          </div>

          <p className="mt-10 text-[10px] text-slate-400 text-center">This is a system-generated document. Verify authenticity with the issuing office quoting the reference number above.</p>
        </div>
      </div>
    </div>
  );
}
