-- Staff CIA marks entry, part 2 (companion to 20260613030000).
--
-- The marks grid lists students by department, but the students SELECT policy
-- only allowed the student themselves + INST_ADMIN/DEPARTMENT_HEAD/SUPER_ADMIN.
-- Without staff read access the grid would render an empty roster, making the
-- new staff write policy useless. This permissive SELECT policy (OR-combined
-- with the existing one) lets a staff member read students in any department
-- where they are assigned to teach a subject — exactly the roster the grid
-- loads. Scope is derived from teaching_assignments → subjects.department_id,
-- and gated on staff.profile_id = auth.uid().

CREATE POLICY "students: staff read own teaching departments"
  ON public.students FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.teaching_assignments ta
    JOIN public.subjects subj ON subj.id = ta.subject_id
    JOIN public.staff s ON s.id = ta.staff_id
    WHERE s.profile_id = auth.uid()
      AND ta.institution_id = students.institution_id
      AND subj.department_id = students.department_id
  ));

NOTIFY pgrst, 'reload schema';
