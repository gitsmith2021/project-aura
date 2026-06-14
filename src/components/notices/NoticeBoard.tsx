import { Pin, Paperclip, CalendarOff, Megaphone } from "lucide-react";
import { sortNotices, AUDIENCE_LABEL, type Notice } from "@/lib/notices";
import { NoticeBadge } from "./NoticeBadge";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Read-only notice board, embeddable in any portal dashboard. */
export function NoticeBoard({ notices, emptyText = "No notices right now." }: { notices: Notice[]; emptyText?: string }) {
  const sorted = sortNotices(notices);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400 dark:text-slate-500">
        <Megaphone size={28} className="opacity-30" />
        <p className="text-xs">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((n) => (
        <article
          key={n.id}
          className={`rounded-xl border bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4 ${
            n.is_pinned
              ? "border-violet-200 dark:border-violet-800/50"
              : "border-slate-200/70 dark:border-slate-700/50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <NoticeBadge type={n.notice_type} />
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {AUDIENCE_LABEL[n.target_audience]}
                {n.departments?.name ? ` · ${n.departments.name}` : ""}
              </span>
            </div>
            {n.is_pinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 shrink-0">
                <Pin size={11} /> Pinned
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">{n.title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{n.body}</p>

          <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            <span>{fmtDate(n.created_at)}</span>
            {n.expires_at && (
              <span className="inline-flex items-center gap-1">
                <CalendarOff size={10} /> expires {fmtDate(n.expires_at)}
              </span>
            )}
            {n.attachment_url && (
              <a
                href={n.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline"
              >
                <Paperclip size={10} /> Attachment
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
