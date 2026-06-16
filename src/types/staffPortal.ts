export type LeaveType   = 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type StaffProfile = {
  id:               string;
  full_name:        string;
  title:            string | null;
  designation:      string | null;
  department_id:    string | null;
  institution_id:   string;
  employment_type:  string | null;
  email:            string | null;
  staff_type:       string | null;
  daily_wage_rate:  number | null;
  departments:      { name: string } | null;
  institutions:     { name: string } | null;
};

export type LeaveRequest = {
  id:             string;
  institution_id: string;
  staff_id:       string;
  leave_type:     LeaveType;
  from_date:      string;
  to_date:        string;
  reason:         string;
  status:         LeaveStatus;
  review_note:    string | null;
  reviewed_at:    string | null;
  created_at:     string;
};

export type StaffScheduleSlot = {
  id:            string;
  day_of_week:   string;
  start_time:    string;
  end_time:      string;
  subject_name:  string;
  department_id: string;
  departments:   { name: string } | null;
};

export type AttendanceSummaryRow = {
  schedule_id:      string;
  subject_name:     string;
  day_of_week:      string;
  start_time:       string;
  end_time:         string;
  classes_held:     number;
  total_present:    number;
  total_marked:     number;
  attendance_pct:   number;
};

export type SalarySlip = {
  id:              string;
  month:           string;
  amount_disbursed: number;
  payment_mode:    string;
  status:          string;
  disbursed_at:    string | null;
  transaction_ref: string | null;
  salary_structure: {
    basic_salary:     number;
    hra:              number;
    ta:               number;
    da:               number;
    other_allowances: number;
    pf_deduction:     number;
    esi_deduction:    number;
    tds_deduction:    number;
    other_deductions: number;
    net_salary:       number;
  } | null;
};

export type StaffDashboardStats = {
  todaysClasses:        StaffScheduleSlot[];
  totalStudents:        number;
  thisMonthAttendance:  number;
  pendingLeaves:        number;
  nextClass:            StaffScheduleSlot | null;
};

// ── Admin leave view ──────────────────────────────────────────────────────────

export type AdminLeaveRequest = LeaveRequest & {
  staff: { full_name: string; title: string | null; designation: string | null } | null;
};
