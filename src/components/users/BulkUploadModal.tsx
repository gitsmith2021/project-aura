"use client";

import { X, Upload } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { normalizeStudentProgram } from "@/lib/studentProgram";
import { STAFF_TYPES, isDailyWage, type StaffType } from "@/lib/staffTypes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: "STAFF" | "STUDENT";
  tenantId: string;
  tenantName: string;
  departments: { id: string; name: string; institution_id: string; funding_type?: string | null }[];
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map(parseCsvLine);
}

function rowLooksLikeHeader(cells: string[]): boolean {
  const joined = cells.map((c) => c.toLowerCase()).join(",");
  return joined.includes("full_name") || joined.includes("department");
}

export function BulkUploadModal({ isOpen, onClose, onSuccess, role, tenantId, tenantName, departments }: Props) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const deptByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departments.filter((x) => x.institution_id === tenantId)) {
      m.set(d.name.trim().toLowerCase(), d.id);
    }
    return m;
  }, [departments, tenantId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setLog([]);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const downloadTemplate = () => {
    const header =
      role === "STAFF"
        ? "full_name,email,phone,department_name,staff_type,daily_wage_rate\nExample Faculty,faculty@college.edu,,Computer Science,teaching,\nExample Support,,,,non-teaching_support,450.00\n"
        : "full_name,email,phone,department_name,program,year\nExample Student,student@college.edu,,Computer Science,UG,1\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = role === "STAFF" ? "staff_upload_template.csv" : "students_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runUpload = async (text: string) => {
    const rows = parseCsv(text);
    if (rows.length === 0) {
      alert("The file is empty.");
      return;
    }
    let start = 0;
    if (rowLooksLikeHeader(rows[0])) start = 1;

    const supabase = createClient();
    const { data: inst } = await supabase
      .from('institutions')
      .select('email_domain')
      .eq('id', tenantId)
      .single();
    const domain = inst?.email_domain ?? null;
    const lines: string[] = [];
    const payloads: Record<string, unknown>[] = [];
    
    const cohortCounts = new Map<string, number>();
    if (role === "STUDENT") {
      const { data: existing } = await supabase
        .from('students')
        .select('department_id, student_program, student_year')
        .eq('institution_id', tenantId);
        
      if (existing) {
        for (const s of existing) {
          if (!s.department_id || !s.student_program || s.student_year == null) continue;
          const k = `${s.department_id}:${s.student_program}:${s.student_year}`;
          cohortCounts.set(k, (cohortCounts.get(k) || 0) + 1);
        }
      }
    }

    for (let i = start; i < rows.length; i++) {
      const cells = rows[i];
      const rowNum = i + 1;
      const full_name = (cells[0] ?? "").trim();
      const email = (cells[1] ?? "").trim() || null;
      const phone = (cells[2] ?? "").trim() || null;
      const department_name = (cells[3] ?? "").trim();

      if (!full_name) {
        lines.push(`Row ${rowNum}: missing full_name — skipped`);
        continue;
      }
      if (!department_name) {
        lines.push(`Row ${rowNum}: missing department_name — skipped`);
        continue;
      }

      const deptId = deptByName.get(department_name.toLowerCase());
      if (!deptId) {
        lines.push(`Row ${rowNum}: unknown department "${department_name}" — skipped`);
        continue;
      }

      let rowEmail = email;
      if (!rowEmail && domain) {
        const words = full_name.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const first = words[0] ?? "";
        const last = words.length > 1 ? words[words.length - 1] : "";
        const local = last ? `${first}.${last}` : first;
        rowEmail = `${local}@${domain}`;
      }

      if (role === "STAFF") {
        const staffTypeRaw = (cells[4] ?? "").trim() as StaffType;
        const staffType: StaffType = STAFF_TYPES.includes(staffTypeRaw) ? staffTypeRaw : "teaching";
        const dailyWageRaw = (cells[5] ?? "").trim();
        const dailyWageRate = isDailyWage(staffType) && dailyWageRaw ? parseFloat(dailyWageRaw) : null;

        payloads.push({
          full_name,
          email: rowEmail,
          phone,
          institution_id: tenantId,
          department_id: deptId,
          staff_type: staffType,
          daily_wage_rate: Number.isFinite(dailyWageRate) ? dailyWageRate : null,
        });
        continue;
      }

      const programRaw = (cells[4] ?? "").trim();
      const yearRaw = (cells[5] ?? "").trim();
      const program = normalizeStudentProgram(programRaw);
      const year = parseInt(yearRaw, 10);

      if (!program) {
        lines.push(`Row ${rowNum}: program must be UG or PG — skipped`);
        continue;
      }
      if (!Number.isFinite(year)) {
        lines.push(`Row ${rowNum}: invalid year — skipped`);
        continue;
      }
      const okYear =
        program === "UG" ? year >= 1 && year <= 3 : year >= 1 && year <= 2;
      if (!okYear) {
        lines.push(`Row ${rowNum}: year ${year} invalid for ${program} — skipped`);
        continue;
      }
      
      const cohortKey = `${deptId}:${program}:${year}`;
      const currentCount = (cohortCounts.get(cohortKey) || 0) + 1;
      cohortCounts.set(cohortKey, currentCount);

      const dept = departments.find(d => d.id === deptId);
      const fundingRaw = dept?.funding_type;
      const funding = fundingRaw === "AIDED" ? "A" : fundingRaw === "SF" ? "SF" : "XX";
      
      const deptName = dept?.name || "";
      let deptPrefix = "XX";
      if (deptName) {
        const words = deptName.split(/[\s-]+/);
        if (words.length > 1) {
          deptPrefix = words.map(w => w[0].toUpperCase()).join("");
        } else {
          deptPrefix = deptName.substring(0, 2).toUpperCase();
        }
      }
      
      const idxStr = String(currentCount).padStart(3, "0");
      const roll_no = `${program}-${funding}-${deptPrefix}-${idxStr}`;

      let studentEmail = email;
      if (!studentEmail && domain) {
        studentEmail = `${roll_no.toLowerCase().replace(/-/g, "")}@${domain}`;
      }

      payloads.push({
        full_name,
        email: studentEmail,
        phone,
        institution_id: tenantId,
        department_id: deptId,
        student_program: program,
        student_year: year,
        roll_no,
      });
    }

    if (payloads.length === 0) {
      setLog(lines.length ? lines : ["No valid rows to import."]);
      alert("No valid rows to import. Check the log below.");
      return;
    }

    setBusy(true);
    setLog([`Importing ${payloads.length} ${role === "STAFF" ? "staff" : "students"}…`, ...lines]);

    const chunk = 40;
    let inserted = 0;
    for (let i = 0; i < payloads.length; i += chunk) {
      const slice = payloads.slice(i, i + chunk);
      const { error } = await supabase.from(role === "STAFF" ? "staff" : "students").insert(slice);
      if (error) {
        setLog((prev) => [...prev, `Batch ${Math.floor(i / chunk) + 1} failed: ${error.message}`]);
        setBusy(false);
        alert("Import stopped due to an error. Partial rows may have been saved.");
        return;
      }
      inserted += slice.length;
    }

    setBusy(false);
    setLog((prev) => [...prev, `Done: inserted ${inserted} rows.`]);
    onSuccess();
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      void runUpload(text);
    };
    reader.readAsText(f, "UTF-8");
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-md h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Bulk upload {role === "STAFF" ? "staff" : "students"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Institution: <span className="font-medium text-slate-700">{tenantName || "—"}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">CSV format</p>
            {role === "STAFF" ? (
              <p>
                Columns: <code className="text-violet-700">full_name</code>,{" "}
                <code className="text-violet-700">email</code>, <code className="text-violet-700">phone</code>,{" "}
                <code className="text-violet-700">department_name</code>,{" "}
                <code className="text-violet-700">staff_type</code>{" "}
                <span className="text-slate-400">(teaching / non-teaching_office / non-teaching_warden / non-teaching_mess / non-teaching_support)</span>,{" "}
                <code className="text-violet-700">daily_wage_rate</code>{" "}
                <span className="text-slate-400">(₹/day — for non-teaching_support only)</span>
              </p>
            ) : (
              <p>
                Columns: <code className="text-violet-700">full_name</code>,{" "}
                <code className="text-violet-700">email</code>, <code className="text-violet-700">phone</code>,{" "}
                <code className="text-violet-700">department_name</code>,{" "}
                <code className="text-violet-700">program</code> (UG or PG),{" "}
                <code className="text-violet-700">year</code> (UG: 1–3, PG: 1–2)
              </p>
            )}
            <p className="text-slate-500">First row may be a header. Department names must match this institution exactly (case-insensitive).</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100"
            >
              Download template
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-md hover:bg-purple-700 cursor-pointer">
              <Upload size={14} />
              Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile} disabled={busy || !tenantId} />
            </label>
          </div>

          {busy && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
              Uploading…
            </div>
          )}

          {log.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 max-h-64 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Import log</p>
              <ul className="text-[11px] text-slate-600 space-y-1 font-mono">
                {log.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
