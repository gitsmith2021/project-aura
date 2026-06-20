-- Audited leave review for mobile (and any non-server-action caller).
--
-- The web reviewLeaveRequest() Server Action updates leave_requests AND writes
-- an audit_logs row via logAudit() (Dev Rule 13). The mobile app can't call
-- that server-only helper, and a direct UPDATE from the client would skip the
-- audit trail. This SECURITY DEFINER function reproduces both steps atomically
-- with its own authorization check, so a phone approve/reject is just as
-- audited as the web. It's the template for future mobile writes on
-- audit-tracked tables.
--
-- SECURITY DEFINER runs as the function owner (bypasses RLS), so the authz
-- check below is load-bearing — it mirrors who the web allows to review:
-- SUPER_ADMIN, or INST_ADMIN/PRINCIPAL/HOD/DEPARTMENT_HEAD of that institution.

CREATE OR REPLACE FUNCTION public.review_leave_request(
  p_leave_id uuid,
  p_status   text,
  p_note     text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_inst     uuid;
  v_before   jsonb;
  v_note     text := NULLIF(btrim(p_note), '');
  v_ok       boolean;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  SELECT lr.institution_id,
         jsonb_build_object('status', lr.status, 'review_note', lr.review_note,
                            'reviewed_at', lr.reviewed_at, 'staff_id', lr.staff_id)
    INTO v_inst, v_before
  FROM public.leave_requests lr
  WHERE lr.id = p_leave_id;

  IF v_inst IS NULL THEN
    RAISE EXCEPTION 'Leave request not found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.institution_members m
    WHERE m.profile_id = v_uid
      AND (
        m.role = 'SUPER_ADMIN'
        OR (m.role IN ('INST_ADMIN', 'PRINCIPAL', 'HOD', 'DEPARTMENT_HEAD')
            AND m.institution_id = v_inst)
      )
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Not authorized to review leave for this institution'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.leave_requests
     SET status      = p_status,
         review_note = v_note,
         reviewed_by = v_uid,
         reviewed_at = now(),
         updated_at  = now()
   WHERE id = p_leave_id;

  -- Append-only audit (Dev Rule 13). Owner-context insert bypasses the
  -- audit_logs admin-only RLS, exactly as the web's service-role logAudit does.
  INSERT INTO public.audit_logs
    (institution_id, performed_by, table_name, record_id, action, before_data, after_data, notes)
  VALUES
    (v_inst, v_uid, 'leave_requests', p_leave_id, 'UPDATE', v_before,
     jsonb_build_object('status', p_status, 'review_note', v_note),
     'Leave ' || p_status || ' (mobile)');
END;
$$;

REVOKE ALL ON FUNCTION public.review_leave_request(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_leave_request(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
