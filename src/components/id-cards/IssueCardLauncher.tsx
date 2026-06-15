"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Nfc } from "lucide-react";
import { CardIssuanceDrawer } from "./CardIssuanceDrawer";

/** Standalone issue page: opens the issuance drawer over a light landing,
 *  returning to the registry once a card is issued or the drawer is closed. */
export function IssueCardLauncher({ institutionId }: { institutionId: string }) {
  const router = useRouter();
  const back = () => router.push(`/institutions/${institutionId}/id-cards`);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/id-cards`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> Card registry
      </Link>
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
        <Nfc size={28} className="opacity-30" />
        <p className="text-xs">Issuing a new smart card…</p>
      </div>
      <CardIssuanceDrawer institutionId={institutionId} onClose={back} onIssued={back} />
    </div>
  );
}
