-- Cleanup orphaned profiles and create users
-- Run this in your Supabase SQL Editor

-- Step 1: Delete orphaned profiles directly by name
DELETE FROM public.profiles
WHERE full_name IN (
  'Igor Chaves',
  'Kelvin Cantarelli',
  'Raul Cirqueira'
);

-- Step 2: Delete any auth users with these emails (in case they exist)
DELETE FROM auth.users
WHERE email IN (
  'igor.chaves@agirsaude.org.br',
  'kelvin@agirsaude.org.br',
  'raul.cirqueira@agirsaude.org.br'
);

-- Step 3: Create users fresh

-- 1. Igor Chaves
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'igor.chaves@agirsaude.org.br',
    crypt('Agir@123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    new_user_id,
    'Igor Chaves',
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ Created user: Igor Chaves (%)' , new_user_id;
END $$;

-- 2. Kelvin Cantarelli
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'kelvin@agirsaude.org.br',
    crypt('Agir@123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    new_user_id,
    'Kelvin Cantarelli',
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ Created user: Kelvin Cantarelli (%)' , new_user_id;
END $$;

-- 3. Raul Cirqueira
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'raul.cirqueira@agirsaude.org.br',
    crypt('Agir@123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    new_user_id,
    'Raul Cirqueira',
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ Created user: Raul Cirqueira (%)' , new_user_id;
END $$;

-- Step 4: Verify the users were created successfully
SELECT
  u.id,
  u.email,
  p.full_name,
  u.email_confirmed_at as "Email Confirmed",
  u.created_at as "Created At"
FROM auth.users u
INNER JOIN public.profiles p ON u.id = p.id
WHERE u.email IN (
  'igor.chaves@agirsaude.org.br',
  'kelvin@agirsaude.org.br',
  'raul.cirqueira@agirsaude.org.br'
)
ORDER BY u.created_at;
