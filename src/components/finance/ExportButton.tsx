"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type Props = {
  data:        Record<string, unknown>[];
  filename:    string;
  reportTitle?: string;
  className?:  string;
};

function toCSV(title: string, data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows    = data.map(row =>
    headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [`# ${title}`, `# Generated: ${new Date().toLocaleString("en-IN")}`, "", headers.join(","), ...rows].join("\n");
}

export function ExportButton({ data, filename, reportTitle = "Report", className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  function handleExport() {
    if (!data.length) return;
    setLoading(true);

    try {
      const csv  = toCSV(reportTitle, data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading || !data.length}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading
        ? <span className="w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
        : <Download size={13} />
      }
      Export CSV
    </button>
  );
}
