export type FeeType = 'tuition' | 'hostel' | 'exam' | 'library' | 'lab' | 'other';

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
