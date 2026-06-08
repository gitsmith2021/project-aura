export type StudentProfile = {
  id:              string;
  full_name:       string;
  email:           string | null;
  roll_no:         string | null;
  student_program: string | null;
  student_year:    number | null;
  department_id:   string | null;
  institution_id:  string;
  departments:     { name: string } | null;
  institutions:    { name: string } | null;
};

export type StudentScheduleSlot = {
  id:            string;
  day_of_week:   string;
  start_time:    string;
  end_time:      string;
  subject_name:  string;
  department_id: string;
};

export type StudentAttendanceRow = {
  schedule_id:      string;
  subject_name:     string;
  day_of_week:      string;
  start_time:       string;
  end_time:         string;
  classes_held:     number;
  classes_attended: number;
  attendance_pct:   number;
};

export type StudentFeePayment = {
  id:              string;
  amount_paid:     number;
  payment_mode:    string;
  payment_status:  string;
  paid_at:         string | null;
  receipt_number:  string | null;
  created_at:      string;
  fee_structure_id: string | null;
  fee_structures:  {
    name:          string;
    fee_type:      string;
    amount:        number;
    academic_year: string;
  } | null;
};

export type StudentFeeStructure = {
  id:            string;
  name:          string;
  fee_type:      string;
  amount:        number;
  academic_year: string;
};

export type StudentDashboardStats = {
  todaysClasses:        StudentScheduleSlot[];
  overallAttendancePct: number;
  totalFeesDue:         number;
  totalFeesPaid:        number;
};
