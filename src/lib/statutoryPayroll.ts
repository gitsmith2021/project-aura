// ─────────────────────────────────────────────────────────────────────────────
// Indian Statutory Payroll — pure computation helpers (no Supabase imports)
// Covers: TDS (Sec. 192), EPF, ESI for FY 2024-25.
// Dev Rule 18: all logic unit-testable without DB.
// ─────────────────────────────────────────────────────────────────────────────

export type TaxRegime = "new" | "old";

export type DeclaredInvestments = {
  section_80c?: number;   // max ₹1,50,000 (old regime only)
  section_80d?: number;   // max ₹25,000   (old regime only)
  hra_exempt?:  number;   // HRA exemption claimed
  lta_exempt?:  number;   // LTA exemption
};

export type StatutoryConfig = {
  pf_employer_pct:  number;   // default 12
  pf_employee_pct:  number;   // default 12
  epf_wage_ceiling: number;   // default 15000
  esi_employer_pct: number;   // default 3.25
  esi_employee_pct: number;   // default 0.75
  esi_wage_ceiling: number;   // default 21000
};

export const DEFAULT_CONFIG: StatutoryConfig = {
  pf_employer_pct:  12,
  pf_employee_pct:  12,
  epf_wage_ceiling: 15000,
  esi_employer_pct: 3.25,
  esi_employee_pct: 0.75,
  esi_wage_ceiling: 21000,
};

export type DeductionResult = {
  gross_salary:  number;
  basic_salary:  number;
  pf_employee:   number;
  pf_employer:   number;
  esi_employee:  number;
  esi_employer:  number;
  tds_monthly:   number;
  annual_tds:    number;
  net_salary:    number;
  esi_applicable: boolean;
  tax_regime:    TaxRegime;
};

// ── Income tax slabs ──────────────────────────────────────────────────────────

/** Compute annual income tax under the NEW regime (FY 2024-25). */
export function computeTaxNewRegime(annualGross: number): number {
  // Standard deduction ₹75,000 (Budget 2024)
  const std = 75_000;
  const taxable = Math.max(0, annualGross - std);

  // 87A rebate: zero tax if net taxable ≤ ₹7,00,000
  if (taxable <= 7_00_000) return 0;

  let tax = 0;
  const slabs: [number, number, number][] = [
    // [lower, upper, rate]
    [0,          3_00_000, 0.00],
    [3_00_000,   7_00_000, 0.05],
    [7_00_000,  10_00_000, 0.10],
    [10_00_000, 12_00_000, 0.15],
    [12_00_000, 15_00_000, 0.20],
    [15_00_000, Infinity,  0.30],
  ];
  for (const [lo, hi, rate] of slabs) {
    if (taxable <= lo) break;
    tax += (Math.min(taxable, hi) - lo) * rate;
  }

  // 4% health & education cess
  return Math.round(tax * 1.04);
}

/** Compute annual income tax under the OLD regime (FY 2024-25). */
export function computeTaxOldRegime(
  annualGross: number,
  declared: DeclaredInvestments = {},
): number {
  const std        = 50_000;
  const cap80c     = Math.min(declared.section_80c ?? 0, 1_50_000);
  const cap80d     = Math.min(declared.section_80d ?? 0, 25_000);
  const hraExempt  = declared.hra_exempt  ?? 0;
  const ltaExempt  = declared.lta_exempt  ?? 0;

  const deductions = std + cap80c + cap80d + hraExempt + ltaExempt;
  const taxable    = Math.max(0, annualGross - deductions);

  // 87A rebate: zero tax if net taxable ≤ ₹5,00,000
  if (taxable <= 5_00_000) return 0;

  let tax = 0;
  const slabs: [number, number, number][] = [
    [0,          2_50_000, 0.00],
    [2_50_000,   5_00_000, 0.05],
    [5_00_000,  10_00_000, 0.20],
    [10_00_000, Infinity,  0.30],
  ];
  for (const [lo, hi, rate] of slabs) {
    if (taxable <= lo) break;
    tax += (Math.min(taxable, hi) - lo) * rate;
  }

  // 4% health & education cess
  return Math.round(tax * 1.04);
}

/** Compute monthly TDS amount from annual tax liability. */
export function monthlyTds(annualTax: number): number {
  return Math.round(annualTax / 12);
}

// ── PF computation ────────────────────────────────────────────────────────────

export type PfResult = { pf_employee: number; pf_employer: number };

/**
 * Compute monthly PF contributions.
 * Employee: pf_employee_pct% of basic.
 * Employer: pf_employer_pct% of min(basic, epf_wage_ceiling).
 */
export function computePF(
  basicSalary: number,
  config: Pick<StatutoryConfig, "pf_employee_pct" | "pf_employer_pct" | "epf_wage_ceiling">,
): PfResult {
  const pf_employee = Math.round((basicSalary * config.pf_employee_pct) / 100);
  const capped      = Math.min(basicSalary, config.epf_wage_ceiling);
  const pf_employer = Math.round((capped * config.pf_employer_pct) / 100);
  return { pf_employee, pf_employer };
}

// ── ESI computation ───────────────────────────────────────────────────────────

export type EsiResult = { esi_employee: number; esi_employer: number; applicable: boolean };

/**
 * Compute monthly ESI contributions.
 * Applicable only if grossSalary ≤ esi_wage_ceiling.
 */
export function computeESI(
  grossSalary: number,
  config: Pick<StatutoryConfig, "esi_employee_pct" | "esi_employer_pct" | "esi_wage_ceiling">,
): EsiResult {
  if (grossSalary > config.esi_wage_ceiling) {
    return { esi_employee: 0, esi_employer: 0, applicable: false };
  }
  const esi_employee = Math.round((grossSalary * config.esi_employee_pct) / 100);
  const esi_employer = Math.round((grossSalary * config.esi_employer_pct) / 100);
  return { esi_employee, esi_employer, applicable: true };
}

// ── Full monthly deduction run ────────────────────────────────────────────────

/**
 * Compute all statutory deductions for one staff member for one month.
 * @param grossSalary   Total gross (basic + HRA + TA + DA + allowances)
 * @param basicSalary   Basic component (used for PF base)
 * @param taxRegime     Which regime the staff member declared
 * @param declared      80C/80D/HRA/LTA declarations (old regime only)
 * @param config        Institution statutory config
 */
export function computeMonthlyDeductions(
  grossSalary: number,
  basicSalary: number,
  taxRegime: TaxRegime,
  declared: DeclaredInvestments,
  config: StatutoryConfig,
): DeductionResult {
  const annualGross = grossSalary * 12;

  const annualTax =
    taxRegime === "new"
      ? computeTaxNewRegime(annualGross)
      : computeTaxOldRegime(annualGross, declared);

  const tds = monthlyTds(annualTax);
  const pf  = computePF(basicSalary, config);
  const esi = computeESI(grossSalary, config);

  const net = Math.max(
    0,
    grossSalary - pf.pf_employee - esi.esi_employee - tds,
  );

  return {
    gross_salary:   parseFloat(grossSalary.toFixed(2)),
    basic_salary:   parseFloat(basicSalary.toFixed(2)),
    pf_employee:    pf.pf_employee,
    pf_employer:    pf.pf_employer,
    esi_employee:   esi.esi_employee,
    esi_employer:   esi.esi_employer,
    tds_monthly:    tds,
    annual_tds:     annualTax,
    net_salary:     parseFloat(net.toFixed(2)),
    esi_applicable: esi.applicable,
    tax_regime:     taxRegime,
  };
}

// ── Form 16 helpers ───────────────────────────────────────────────────────────

/** Financial year label from a year-start (e.g. 2024 → "2024-25"). */
export function fyLabel(yearStart: number): string {
  return `${yearStart}-${String(yearStart + 1).slice(2)}`;
}

/** Months in a financial year starting from April. */
export function fyMonths(yearStart: number): string[] {
  return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m) => {
    const y = m >= 4 ? yearStart : yearStart + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  });
}

/** Year-start of the financial year that a given YYYY-MM month belongs to. */
export function fyFromMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return m >= 4 ? y : y - 1;
}

/** Aggregate total TDS deducted across a list of monthly deduction rows. */
export function totalAnnualTds(rows: { tds_deducted: number }[]): number {
  return rows.reduce((s, r) => s + Number(r.tds_deducted), 0);
}
