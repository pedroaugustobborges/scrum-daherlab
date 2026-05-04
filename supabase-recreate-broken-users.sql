-- ============================================================
-- Recria usuários com problema de auth.identities
-- Senha inicial: Agir@123
-- ============================================================

DO $$
DECLARE
  v_id uuid;
BEGIN

  -- --------------------------------------------------------
  -- 1. Gabriel Isaque
  -- --------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'gabriel.isaque@agirsaude.org.br';

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'gabriel.isaque@agirsaude.org.br',
    crypt('Agir@123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Gabriel Isaque"}'::jsonb,
    false, 'authenticated', 'authenticated',
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', 'gabriel.isaque@agirsaude.org.br', 'email_verified', true, 'full_name', 'Gabriel Isaque'),
    'email', v_id::text,
    now(), now(), now()
  );

  INSERT INTO public.profiles (id, email, full_name, employee_internal_id, is_admin, created_at, updated_at)
  VALUES (v_id, 'gabriel.isaque@agirsaude.org.br', 'Gabriel Isaque', '70761047174', false, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        employee_internal_id = EXCLUDED.employee_internal_id,
        updated_at = now();

  -- --------------------------------------------------------
  -- 2. Wanderson Braga
  -- --------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'wanderson.braga@agirsaude.org.br';

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'wanderson.braga@agirsaude.org.br',
    crypt('Agir@123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Wanderson Braga"}'::jsonb,
    false, 'authenticated', 'authenticated',
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', 'wanderson.braga@agirsaude.org.br', 'email_verified', true, 'full_name', 'Wanderson Braga'),
    'email', v_id::text,
    now(), now(), now()
  );

  INSERT INTO public.profiles (id, email, full_name, employee_internal_id, is_admin, created_at, updated_at)
  VALUES (v_id, 'wanderson.braga@agirsaude.org.br', 'Wanderson Braga', '03294780109', false, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        employee_internal_id = EXCLUDED.employee_internal_id,
        updated_at = now();

  -- --------------------------------------------------------
  -- 3. Janerson Douglas
  -- --------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'janerson.douglas@agirsaude.org.br';

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'janerson.douglas@agirsaude.org.br',
    crypt('Agir@123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Janerson Douglas"}'::jsonb,
    false, 'authenticated', 'authenticated',
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', 'janerson.douglas@agirsaude.org.br', 'email_verified', true, 'full_name', 'Janerson Douglas'),
    'email', v_id::text,
    now(), now(), now()
  );

  INSERT INTO public.profiles (id, email, full_name, employee_internal_id, is_admin, created_at, updated_at)
  VALUES (v_id, 'janerson.douglas@agirsaude.org.br', 'Janerson Douglas', '12345679874', false, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        employee_internal_id = EXCLUDED.employee_internal_id,
        updated_at = now();

END $$;

-- ============================================================
-- Verificação: deve retornar os 3 usuários com identity_id preenchido
-- ============================================================
SELECT
  u.email,
  p.full_name,
  p.employee_internal_id,
  u.email_confirmed_at,
  i.id AS identity_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
WHERE u.email IN (
  'gabriel.isaque@agirsaude.org.br',
  'wanderson.braga@agirsaude.org.br',
  'janerson.douglas@agirsaude.org.br'
);
