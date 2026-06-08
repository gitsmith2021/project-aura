-- "Function Search Path Mutable" advisor warning: without a fixed search_path,
-- a trigger function can be tricked by a malicious schema earlier in the caller's
-- search_path into resolving identifiers to attacker-controlled objects. This
-- function only touches NEW.updated_at (no schema-qualified lookups needed), so
-- pinning search_path to empty is a pure hardening change with no behavior impact.
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
