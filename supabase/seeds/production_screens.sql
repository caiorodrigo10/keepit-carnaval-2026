-- Production Seed: LED Screens Configuration
-- This seed configures the LED screens for Carnaval 2026 at Anhembi
--
-- Screen layout:
-- - Henco: Main LED screen (primary display)
-- - Keepit Stand 1 & 2: Keepit booth screens
-- - Renko 1-3: Partner screens (quantity TBD based on negotiation)
--
-- Run this in production before the event starts.

-- Clear existing screens (if any) and insert production config
DELETE FROM public.screens WHERE id LIKE 'henco-%' OR id LIKE 'keepit-%' OR id LIKE 'renko-%';

-- Insert production screens
INSERT INTO public.screens (id, name, status, created_at)
VALUES
  -- Henco Main Screen
  ('henco-main', 'Henco Principal', 'offline', NOW()),

  -- Keepit Booth Screens
  ('keepit-1', 'Keepit Stand 1', 'offline', NOW()),
  ('keepit-2', 'Keepit Stand 2', 'offline', NOW()),

  -- Renko Partner Screens (adjust based on final negotiation)
  ('renko-1', 'Renko 1', 'offline', NOW()),
  ('renko-2', 'Renko 2', 'offline', NOW()),
  ('renko-3', 'Renko 3', 'offline', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'offline';

-- Verify screens are created
SELECT id, name, status, created_at FROM public.screens ORDER BY id;
