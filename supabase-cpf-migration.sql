-- ============================================================
-- Migração: adiciona employee_internal_id (CPF) à tabela profiles
-- ============================================================

-- 0. Drop das funções existentes para permitir mudança de assinatura
DROP FUNCTION IF EXISTS admin_get_all_users();
DROP FUNCTION IF EXISTS admin_create_user(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_update_user_profile(UUID, TEXT, TEXT);

-- 1. Adiciona a coluna
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employee_internal_id TEXT;

-- 2. Atualiza a função admin_get_all_users para retornar o novo campo
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin  boolean;
  v_users     jsonb;
BEGIN
  v_caller_id := auth.uid();

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                   p.id,
      'email',                p.email,
      'full_name',            p.full_name,
      'is_admin',             COALESCE(p.is_admin, false),
      'employee_internal_id', p.employee_internal_id,
      'created_at',           p.created_at,
      'last_sign_in_at',      u.last_sign_in_at
    )
    ORDER BY p.created_at DESC
  )
  INTO v_users
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id;

  RETURN jsonb_build_object('success', true, 'users', COALESCE(v_users, '[]'::jsonb));
END;
$$;

-- 3. Atualiza a função admin_create_user para aceitar o CPF
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email      TEXT,
  user_password   TEXT,
  user_full_name  TEXT,
  user_cpf        TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id  uuid;
  v_is_admin   boolean;
  v_new_user   uuid;
BEGIN
  v_caller_id := auth.uid();

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Cria o usuário no auth
  v_new_user := (
    SELECT id FROM auth.users
    WHERE email = user_email
    LIMIT 1
  );

  IF v_new_user IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email já cadastrado');
  END IF;

  v_new_user := extensions.uuid_generate_v4();

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
  ) VALUES (
    v_new_user,
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', user_full_name),
    'authenticated', 'authenticated'
  );

  -- Upsert no profile com CPF
  INSERT INTO profiles (id, email, full_name, employee_internal_id, created_at)
  VALUES (v_new_user, user_email, user_full_name, user_cpf, now())
  ON CONFLICT (id) DO UPDATE
    SET full_name            = EXCLUDED.full_name,
        employee_internal_id = EXCLUDED.employee_internal_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_new_user);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Nova função para editar nome e CPF de um usuário
CREATE OR REPLACE FUNCTION admin_update_user_profile(
  target_user_id  UUID,
  new_full_name   TEXT,
  new_cpf         TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin  boolean;
BEGIN
  v_caller_id := auth.uid();

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE profiles
  SET full_name            = new_full_name,
      employee_internal_id = new_cpf
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
