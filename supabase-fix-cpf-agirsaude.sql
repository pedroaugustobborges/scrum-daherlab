-- ============================================================
-- Fix: employee_internal_id (CPF) for SQL-created users
-- Gabriel, Wanderson and Janerson from agirsaude.org.br
--
-- Root cause: profiles created via SQL editor without the
-- email or employee_internal_id columns. admin_get_all_users
-- reads p.email from profiles (not auth.users), so edits via
-- the Admin panel may have silently missed the row, or the
-- CPF was saved with formatting instead of digits-only.
--
-- Run this in the Supabase SQL Editor (no changes to auth schema).
-- ============================================================

-- 1. Upsert the three profiles with the correct digit-only CPFs.
--    Uses auth.users as the source of truth for the user ID.
--    ON CONFLICT(id): if profile row already exists, only the
--    employee_internal_id (and email if missing) are patched.

INSERT INTO public.profiles (id, email, full_name, employee_internal_id, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(p.full_name, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))),
  fix.cpf,
  COALESCE(p.created_at, u.created_at)
FROM auth.users u
JOIN (VALUES
  ('gabriel.isaque@agirsaude.org.br',   '70761047174'),
  ('wanderson.braga@agirsaude.org.br',  '03294780109'),
  ('janerson.douglas@agirsaude.org.br', '12345679874')
) AS fix(email, cpf) ON fix.email = u.email
LEFT JOIN public.profiles p ON p.id = u.id
ON CONFLICT (id) DO UPDATE
  SET employee_internal_id = EXCLUDED.employee_internal_id,
      -- also backfill email in profiles if it was missing
      email = COALESCE(profiles.email, EXCLUDED.email);

-- 2. Verify — should show all three rows with digit-only CPFs.
SELECT
  u.email,
  p.full_name,
  p.employee_internal_id,
  CASE
    WHEN p.employee_internal_id ~ '^\d{11}$' THEN '✅ formato correto'
    ELSE '❌ formato incorreto ou nulo'
  END AS cpf_status
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'gabriel.isaque@agirsaude.org.br',
  'wanderson.braga@agirsaude.org.br',
  'janerson.douglas@agirsaude.org.br'
)
ORDER BY u.email;
