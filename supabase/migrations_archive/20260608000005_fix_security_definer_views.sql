-- These 3 views were created with the (implicit, pre-PG15-default) SECURITY DEFINER
-- behavior, meaning they run with the view creator's privileges and bypass the
-- querying user's RLS policies entirely — any authenticated user reading them would
-- see budget/fee/payroll data across every institution. Postgres 15+ lets us flip
-- this with a simple reloption instead of dropping and recreating the view.
ALTER VIEW public.dept_budget_vs_actuals SET (security_invoker = true);
ALTER VIEW public.student_fee_summary SET (security_invoker = true);
ALTER VIEW public.monthly_pl SET (security_invoker = true);
