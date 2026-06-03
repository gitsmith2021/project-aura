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
