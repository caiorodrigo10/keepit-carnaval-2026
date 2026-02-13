-- Production Seed: Admin Users Configuration
-- This seed creates admin and moderator users for Carnaval 2026
--
-- IMPORTANT: Before running this script:
-- 1. Create the auth users in Supabase Dashboard (Authentication > Users)
-- 2. Use strong, unique passwords for each user
-- 3. Enable email confirmation for production users
--
-- After creating auth users, this script links them to admin_users table.

-- =============================================================================
-- STEP 1: Insert admin_users records (will be linked after auth user creation)
-- =============================================================================

-- Production Admin Users
-- Update emails and names with actual team members
INSERT INTO public.admin_users (id, name, email, role)
VALUES
  -- Administrators (full access)
  (
    gen_random_uuid(),
    'Admin Keepit',
    'admin@keepit.com.br',
    'admin'
  ),
  (
    gen_random_uuid(),
    'Caio Admin',
    'caio@keepit.com.br',
    'admin'
  ),

  -- Moderators (moderation access only)
  (
    gen_random_uuid(),
    'Moderador 1',
    'moderador1@keepit.com.br',
    'moderator'
  ),
  (
    gen_random_uuid(),
    'Moderador 2',
    'moderador2@keepit.com.br',
    'moderator'
  ),
  (
    gen_random_uuid(),
    'Moderador 3',
    'moderador3@keepit.com.br',
    'moderator'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- =============================================================================
-- STEP 2: Link auth users to admin_users (run after creating auth users)
-- =============================================================================

-- This update links the auth.users to admin_users by email
UPDATE public.admin_users
SET user_id = (
  SELECT id FROM auth.users WHERE email = admin_users.email
)
WHERE user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_users.email
  );

-- =============================================================================
-- STEP 3: Verify the setup
-- =============================================================================

SELECT
  au.id,
  au.name,
  au.email,
  au.role,
  CASE
    WHEN au.user_id IS NOT NULL THEN 'Linked'
    ELSE 'Pending auth user creation'
  END as auth_status,
  au.created_at
FROM public.admin_users au
ORDER BY au.role, au.email;
