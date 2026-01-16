  -- Create a new user in Supabase Auth
  -- User: Victoria Benigno
  -- Email: victoria.benigno@agirsaude.org.br
  -- Password: Agir@123

  DO $$
  DECLARE
    new_user_id uuid;
  BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();

    -- Insert into auth.users
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
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'victoria.benigno@agirsaude.org.br',
      crypt('Agir@123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Victoria Benigno"}',
      FALSE,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );

    -- Insert into auth.identities (required for email login)
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
      new_user_id,
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', 'victoria.benigno@agirsaude.org.br',
        'email_verified', true,
        'full_name', 'Victoria Benigno'
      ),
      'email',
      new_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

    -- Insert into public.profiles (without email column)
    INSERT INTO public.profiles (id, full_name, created_at, updated_at)
    VALUES (
      new_user_id,
      'Victoria Benigno',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Victoria Benigno',
      updated_at = NOW();

    RAISE NOTICE 'User created successfully with ID: %', new_user_id;
  END $$;