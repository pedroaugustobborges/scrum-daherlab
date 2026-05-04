-- ============================================================
-- FIX: admin_create_user estava sem inserção em auth.identities
-- O supabase-cpf-migration.sql sobrescreveu a função e removeu
-- o INSERT em auth.identities, que é obrigatório para login
-- email/senha funcionar. Sem ele, o Supabase retorna 400.
-- ============================================================

-- ============================================================
-- PARTE 1: Corrige admin_create_user (novos usuários)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email      TEXT,
  user_password   TEXT,
  user_full_name  TEXT,
  user_cpf        TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  -- Verifica se email já existe
  SELECT id INTO v_new_user FROM auth.users WHERE email = user_email LIMIT 1;

  IF v_new_user IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email já cadastrado');
  END IF;

  v_new_user := gen_random_uuid();

  -- Insere na tabela de usuários
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_new_user,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', user_full_name),
    false,
    'authenticated',
    'authenticated',
    '', '', '', ''
  );

  -- OBRIGATÓRIO: insere em auth.identities para o login email/senha funcionar
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at,
    last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    v_new_user,
    jsonb_build_object(
      'sub',            v_new_user::text,
      'email',          user_email,
      'email_verified', true,
      'full_name',      user_full_name
    ),
    'email',
    v_new_user::text,
    now(),
    now(),
    now()
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

-- ============================================================
-- PARTE 2: Corrige admin_reset_user_password
-- Além de atualizar a senha, garante que auth.identities existe.
-- Isso cura usuários quebrados diretamente via reset de senha.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    calling_user_id UUID;
    is_caller_admin BOOLEAN;
    target_email TEXT;
BEGIN
    calling_user_id := auth.uid();

    SELECT is_admin INTO is_caller_admin
    FROM public.profiles
    WHERE id = calling_user_id;

    IF NOT COALESCE(is_caller_admin, FALSE) THEN
        RETURN json_build_object('success', FALSE, 'error', 'Unauthorized: Only admins can reset passwords');
    END IF;

    IF LENGTH(new_password) < 6 THEN
        RETURN json_build_object('success', FALSE, 'error', 'Password must be at least 6 characters');
    END IF;

    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;

    IF target_email IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'User not found');
    END IF;

    -- Atualiza a senha
    UPDATE auth.users
    SET
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Garante que auth.identities existe (cura usuários criados com bug)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        created_at,
        updated_at,
        last_sign_in_at
    )
    SELECT
        gen_random_uuid(),
        target_user_id,
        jsonb_build_object(
            'sub',            target_user_id::text,
            'email',          target_email,
            'email_verified', true
        ),
        'email',
        target_user_id::text,
        NOW(),
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.identities
        WHERE user_id = target_user_id AND provider = 'email'
    );

    RETURN json_build_object(
        'success', TRUE,
        'user_id', target_user_id,
        'email', target_email,
        'message', 'Password reset successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- PARTE 3: Backfill — insere auth.identities para todos os
-- usuários que estão sem ela (criados com o bug)
-- ============================================================
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub',            u.id::text,
    'email',          u.email,
    'email_verified', true,
    'full_name',      COALESCE(p.full_name, '')
  ),
  'email',
  u.id::text,
  u.created_at,
  now(),
  now()
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
LEFT JOIN public.profiles p ON p.id = u.id
WHERE i.id IS NULL;

-- ============================================================
-- VERIFICAÇÃO: rode esta query depois para confirmar
-- Se retornar 0 linhas, todos os usuários estão OK
-- ============================================================
-- SELECT u.email, u.created_at
-- FROM auth.users u
-- LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
-- WHERE i.id IS NULL;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
