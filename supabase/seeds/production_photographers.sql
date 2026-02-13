-- Production Seed: Photographers Configuration
-- This seed creates photographer accounts for Carnaval 2026
--
-- IMPORTANT: Before running this script:
-- 1. Create the auth users in Supabase Dashboard (Authentication > Users)
-- 2. Use strong, unique passwords for each photographer
-- 3. Share credentials securely with the photography team
--
-- After creating auth users, this script links them to photographers table.

-- =============================================================================
-- STEP 1: Insert photographer records (will be linked after auth user creation)
-- =============================================================================

-- Production Photographers
-- Update with actual photographer emails and names
INSERT INTO public.photographers (id, name, email)
VALUES
  (
    gen_random_uuid(),
    'Fotografo Keepit 1',
    'foto1@keepit.com.br'
  ),
  (
    gen_random_uuid(),
    'Fotografo Keepit 2',
    'foto2@keepit.com.br'
  ),
  (
    gen_random_uuid(),
    'Fotografo Keepit 3',
    'foto3@keepit.com.br'
  ),
  (
    gen_random_uuid(),
    'Fotografo Keepit 4',
    'foto4@keepit.com.br'
  ),
  (
    gen_random_uuid(),
    'Fotografo Keepit 5',
    'foto5@keepit.com.br'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name;

-- =============================================================================
-- STEP 2: Link auth users to photographers (run after creating auth users)
-- =============================================================================

-- This update links the auth.users to photographers by email
UPDATE public.photographers
SET user_id = (
  SELECT id FROM auth.users WHERE email = photographers.email
)
WHERE user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = photographers.email
  );

-- =============================================================================
-- STEP 3: Verify the setup
-- =============================================================================

SELECT
  p.id,
  p.name,
  p.email,
  CASE
    WHEN p.user_id IS NOT NULL THEN 'Linked'
    ELSE 'Pending auth user creation'
  END as auth_status,
  p.created_at
FROM public.photographers p
ORDER BY p.email;
