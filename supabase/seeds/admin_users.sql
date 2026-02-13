-- Seed file for admin users
-- This file contains test admin users for development
--
-- NOTE: To create working admin users, you need to:
-- 1. Create users in Supabase Auth (Dashboard > Authentication > Users)
-- 2. Update the user_id field in this table with the auth.users.id
--
-- Test credentials:
-- Admin: admin@keepit.com.br / Keepit2026!
-- Moderator: moderador@keepit.com.br / Keepit2026!
--
-- After creating users in auth, run this SQL to link them:

-- First, let's ensure we have the admin users in the admin_users table
-- These will be linked to auth users after they're created

INSERT INTO public.admin_users (id, name, email, role)
VALUES
  (
    gen_random_uuid(),
    'Admin Keepit',
    'admin@keepit.com.br',
    'admin'
  ),
  (
    gen_random_uuid(),
    'Moderador Keepit',
    'moderador@keepit.com.br',
    'moderator'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- To link existing auth users to admin_users, run:
-- UPDATE public.admin_users
-- SET user_id = (SELECT id FROM auth.users WHERE email = admin_users.email)
-- WHERE user_id IS NULL;
