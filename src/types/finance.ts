export type FeeType = 'tuition' | 'hostel' | 'exam' | 'library' | 'lab' | 'other';
export type PaymentMode   = 'cash' | 'upi' | 'razorpay' | 'bank_transfer' | 'cheque' | 'dd';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type FeePayment = {
  id: string;
  institution_id: string;
  student_id: string;
  fee_structure_id: string | null;
  amount_paid: number;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  students: { full_name: string; roll_no: string | null } | null;
  fee_structures: { name: string; fee_type: string } | null;
};

export type PaymentSummary = {
  totalCollected: number;
  totalPending: number;
  totalFailed: number;
  totalTransactions: number;
  countByMode: Record<PaymentMode, number>;
};

export type FeeStructure = {
  id: string;
  institution_id: string;
  department_id: string | null;
  name: string;
  fee_type: FeeType;
  amount: number;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  departments: { name: string } | null;
};

export type FeeStructurePayload = {
  name: string;
  fee_type: FeeType;
  amount: number;
  academic_year: string;
  institution_id: string;
  department_id?: string | null;
};

// ── Salary ────────────────────────────────────────────────────────────────────

export type SalaryStructure = {
  id: string;
  institution_id: string;
  staff_id: string;
  basic_salary: number;
  hra: number;
  ta: number;
  da: number;
  other_allowances: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_deduction: number;
  other_deductions: number;
  net_salary: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  staff: {
    full_name: string;
    title: string | null;
    designation: string | null;
    department_id: string | null;
    departments: { name: string } | null;
  } | null;
};

export type DisbursementStatus = 'pending' | 'processed' | 'failed' | 'on_hold';
export type DisbursementMode   = 'bank_transfer' | 'cheque' | 'cash' | 'neft' | 'rtgs';

export type SalaryDisbursement = {
  id: string;
  institution_id: string;
  staff_id: string;
  salary_structure_id: string | null;
  month: string;
  amount_disbursed: number;
  payment_mode: DisbursementMode;
  status: DisbursementStatus;
  disbursed_at: string | null;
  transaction_ref: string | null;
  remarks: string | null;
  staff: {
    full_name: string;
    title: string | null;
    designation: string | null;
  } | null;
};

export type SalarySummary = {
  totalStaff: number;
  structuresSetup: number;
  pendingDisbursements: number;
  processedDisbursements: number;
  totalPayroll: number;
  totalDisbursed: number;
};

export type StaffWithoutSalary = {
  id: string;
  full_name: string;
  title: string | null;
  designation: string | null;
  department_id: string | null;
  departments: { name: string } | null;
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'utilities' | 'maintenance' | 'vendor' | 'events'
  | 'stationery' | 'infrastructure' | 'it' | 'other';

export type ExpensePaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card';

export type Expense = {
  id: string;
  institution_id: string;
  department_id: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_mode: ExpensePaymentMode;
  vendor_name: string | null;
  receipt_url: string | null;
  expense_date: string;
  notes: string | null;
  created_at: string;
  departments: { name: string } | null;
};

export type ExpenseSummary = {
  totalExpenses: number;
  totalExpensesAllTime: number;
  byCategory: Record<ExpenseCategory, number>;
  byDepartment: { department_name: string; total: number }[];
  topVendors: { vendor_name: string; total: number; count: number }[];
};

// ── Statutory Payroll ─────────────────────────────────────────────────────────

export type StatutoryPayrollConfig = {
  id:               string;
  institution_id:   string;
  pf_employer_pct:  number;
  pf_employee_pct:  number;
  epf_wage_ceiling: number;
  esi_employer_pct: number;
  esi_employee_pct: number;
  esi_wage_ceiling: number;
  tan_number:       string | null;
  pf_number:        string | null;
  esi_number:       string | null;
  updated_at:       string;
};

export type StaffTaxDeclaration = {
  id:                  string;
  institution_id:      string;
  staff_id:            string;
  academic_year_id:    string | null;
  tax_regime:          "old" | "new";
  declared_investments: {
    section_80c?: number;
    section_80d?: number;
    hra_exempt?:  number;
    lta_exempt?:  number;
  };
  total_declared:      number;
  updated_at:          string;
};

export type MonthlyStatutoryDeduction = {
  id:                     string;
  institution_id:         string;
  staff_id:               string;
  salary_disbursement_id: string | null;
  month:                  string;
  gross_salary:           number;
  basic_salary:           number;
  tds_deducted:           number;
  pf_employee:            number;
  pf_employer:            number;
  esi_employee:           number;
  esi_employer:           number;
  net_salary:             number;
  tax_regime:             "old" | "new";
  created_at:             string;
  staff?: {
    full_name:   string;
    title:       string | null;
    designation: string | null;
    employee_id: string | null;
    departments: { name: string } | null;
  } | null;
};

export type StatutorySummary = {
  totalTds:        number;
  totalPfEmployee: number;
  totalPfEmployer: number;
  totalEsiEmployee: number;
  totalEsiEmployer: number;
  staffProcessed:  number;
  staffPending:    number;
};

// ── Reports ───────────────────────────────────────────────────────────────────

export type MonthlyPLData = {
  month:     string;   // "Jan", "Feb" etc.
  month_num: number;   // 1-12
  income:    number;
  expenses:  number;
  salary:    number;
  net:       number;
};

export type StudentFeeReportRow = {
  student_id:        string;
  full_name:         string;
  roll_no:           string | null;
  student_program:   string | null;
  student_year:      number | null;
  department_name:   string | null;
  total_due:         number;
  total_paid:        number;
  balance_due:       number;
  last_payment_date: string | null;
  status:            'fully_paid' | 'partially_paid' | 'unpaid';
};

export type SalaryReportRow = {
  staff_id:            string;
  full_name:           string;
  title:               string | null;
  designation:         string | null;
  department_name:     string | null;
  net_salary:          number;
  disbursement_status: string | null;
  disbursed_at:        string | null;
  transaction_ref:     string | null;
  payment_mode:        string | null;
};

export type FinancialSummary = {
  totalIncome:           number;
  totalExpenditure:      number;
  netSurplus:            number;
  feeCollectionRate:     number;
  payrollPct:            number;
  topExpenseCategories:  { category: string; amount: number }[];
  highestIncomeMonth:    string;
  highestExpenseMonth:   string;
};
