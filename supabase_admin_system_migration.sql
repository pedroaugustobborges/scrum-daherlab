-- ================================================
-- ADMIN SYSTEM MIGRATION
-- ================================================
-- This migration adds admin functionality including:
-- - is_admin column on profiles
-- - User creation function for admins
-- - Updated RLS policies for admin access
-- ================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add is_admin column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- ================================================
-- 3. SET FIRST ADMIN
-- ================================================
-- Set pedroaugustobborges@gmail.com as the first admin

UPDATE public.profiles
SET is_admin = TRUE
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'pedroaugustobborges@gmail.com'
);

-- ================================================
-- 4. CREATE USER CREATION FUNCTION
-- ================================================
-- This function allows admins to create new users directly
-- It inserts into auth.users, auth.identities, and public.profiles

CREATE OR REPLACE FUNCTION public.admin_create_user(
    user_email TEXT,
    user_password TEXT,
    user_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_user_id UUID;
    calling_user_id UUID;
    is_caller_admin BOOLEAN;
    result JSON;
BEGIN
    -- Get the calling user's ID
    calling_user_id := auth.uid();

    -- Check if the calling user is an admin
    SELECT is_admin INTO is_caller_admin
    FROM public.profiles
    WHERE id = calling_user_id;

    IF NOT COALESCE(is_caller_admin, FALSE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Unauthorized: Only admins can create users'
        );
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Email already exists'
        );
    END IF;

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
        user_email,
        crypt(user_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', user_full_name),
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
            'email', user_email,
            'email_verified', true,
            'full_name', user_full_name
        ),
        'email',
        new_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, full_name, created_at, updated_at, is_admin)
    VALUES (
        new_user_id,
        user_full_name,
        NOW(),
        NOW(),
        FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = user_full_name,
        updated_at = NOW();

    RETURN json_build_object(
        'success', TRUE,
        'user_id', new_user_id,
        'email', user_email,
        'full_name', user_full_name
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

-- ================================================
-- 5. CREATE ADMIN TOGGLE FUNCTION
-- ================================================
-- This function allows admins to make other users admin

CREATE OR REPLACE FUNCTION public.admin_toggle_user_admin(
    target_user_id UUID,
    make_admin BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calling_user_id UUID;
    is_caller_admin BOOLEAN;
    target_email TEXT;
BEGIN
    -- Get the calling user's ID
    calling_user_id := auth.uid();

    -- Check if the calling user is an admin
    SELECT is_admin INTO is_caller_admin
    FROM public.profiles
    WHERE id = calling_user_id;

    IF NOT COALESCE(is_caller_admin, FALSE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Unauthorized: Only admins can modify admin status'
        );
    END IF;

    -- Prevent removing admin from yourself
    IF target_user_id = calling_user_id AND NOT make_admin THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Cannot remove your own admin status'
        );
    END IF;

    -- Update the target user's admin status
    UPDATE public.profiles
    SET is_admin = make_admin, updated_at = NOW()
    WHERE id = target_user_id;

    -- Get target user email for response
    SELECT email INTO target_email
    FROM auth.users
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', TRUE,
        'user_id', target_user_id,
        'email', target_email,
        'is_admin', make_admin
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

-- ================================================
-- 6. CREATE DELETE USER FUNCTION
-- ================================================
-- This function allows admins to delete users

CREATE OR REPLACE FUNCTION public.admin_delete_user(
    target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calling_user_id UUID;
    is_caller_admin BOOLEAN;
    target_email TEXT;
BEGIN
    -- Get the calling user's ID
    calling_user_id := auth.uid();

    -- Check if the calling user is an admin
    SELECT is_admin INTO is_caller_admin
    FROM public.profiles
    WHERE id = calling_user_id;

    IF NOT COALESCE(is_caller_admin, FALSE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Unauthorized: Only admins can delete users'
        );
    END IF;

    -- Prevent deleting yourself
    IF target_user_id = calling_user_id THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Cannot delete your own account'
        );
    END IF;

    -- Get target user email for response
    SELECT email INTO target_email
    FROM auth.users
    WHERE id = target_user_id;

    -- Delete from auth.users (cascades to identities and profiles)
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN json_build_object(
        'success', TRUE,
        'deleted_user_id', target_user_id,
        'deleted_email', target_email
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

-- ================================================
-- 7. UPDATE PROJECT RLS POLICY FOR ADMINS
-- ================================================
-- Update the user_has_project_access function to include admin check

CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_user_admin BOOLEAN;
BEGIN
    -- Check if user is admin (admins can see all projects)
    SELECT is_admin INTO is_user_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(is_user_admin, FALSE) THEN
        RETURN TRUE;
    END IF;

    -- Non-admin access checks
    RETURN EXISTS (
        -- User is the creator
        SELECT 1 FROM public.projects
        WHERE id = project_uuid AND created_by = auth.uid()
    ) OR EXISTS (
        -- User is a member of a team associated with the project
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
        WHERE pt.project_id = project_uuid AND tm.user_id = auth.uid()
    ) OR EXISTS (
        -- Fallback: Project has no teams assigned (legacy/unassigned projects visible to all)
        SELECT 1 FROM public.projects p
        WHERE p.id = project_uuid
        AND NOT EXISTS (
            SELECT 1 FROM public.project_teams pt WHERE pt.project_id = p.id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. CREATE FUNCTION TO GET ALL USERS (ADMIN ONLY)
-- ================================================

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calling_user_id UUID;
    is_caller_admin BOOLEAN;
    users_data JSON;
BEGIN
    -- Get the calling user's ID
    calling_user_id := auth.uid();

    -- Check if the calling user is an admin
    SELECT is_admin INTO is_caller_admin
    FROM public.profiles
    WHERE id = calling_user_id;

    IF NOT COALESCE(is_caller_admin, FALSE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Unauthorized: Only admins can view all users'
        );
    END IF;

    -- Get all users with their profile info
    SELECT json_agg(
        json_build_object(
            'id', u.id,
            'email', u.email,
            'full_name', p.full_name,
            'is_admin', COALESCE(p.is_admin, FALSE),
            'created_at', u.created_at,
            'last_sign_in_at', u.last_sign_in_at
        ) ORDER BY u.created_at DESC
    ) INTO users_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id;

    RETURN json_build_object(
        'success', TRUE,
        'users', COALESCE(users_data, '[]'::json)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

-- ================================================
-- 9. GRANT EXECUTE PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users TO authenticated;

-- ================================================
-- 10. COMMENTS
-- ================================================

COMMENT ON COLUMN public.profiles.is_admin IS 'Indicates if the user has admin privileges';
COMMENT ON FUNCTION public.admin_create_user IS 'Allows admins to create new users directly';
COMMENT ON FUNCTION public.admin_toggle_user_admin IS 'Allows admins to toggle admin status of users';
COMMENT ON FUNCTION public.admin_delete_user IS 'Allows admins to delete users';
COMMENT ON FUNCTION public.admin_get_all_users IS 'Allows admins to get list of all users';

-- ================================================
-- END OF MIGRATION
-- ================================================
