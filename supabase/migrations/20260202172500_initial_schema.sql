-- Keepit Carnaval 2026 - Initial Schema
-- Migration: 001_initial_schema
-- Created: 2026-02-02
-- Applied via Supabase MCP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE photo_source AS ENUM ('photographer', 'user');
CREATE TYPE moderation_action AS ENUM ('approved', 'rejected', 'blocked');
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'photographer');
CREATE TYPE lead_origin AS ENUM ('qr_code', 'spontaneous', 'traffic');
CREATE TYPE screen_status AS ENUM ('online', 'offline', 'paused');

-- =====================================================
-- TABLES
-- =====================================================

-- 1. Photographers Table
CREATE TABLE photographers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photographers_user_id ON photographers(user_id);
CREATE INDEX idx_photographers_email ON photographers(email);

-- 2. Admin Users Table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'moderator',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- 3. Photos Table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id UUID REFERENCES photographers(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status photo_status DEFAULT 'pending',
  source photo_source NOT NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  displayed_count INTEGER DEFAULT 0
);

CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_source ON photos(source);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_photographer ON photos(photographer_id);
CREATE INDEX idx_photos_approved_recent ON photos(status, created_at DESC) WHERE status = 'approved';

-- 4. Leads Table (INDEPENDENT from photos)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  franchise_interest BOOLEAN DEFAULT FALSE,
  origin lead_origin NOT NULL DEFAULT 'qr_code',
  lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leads_email_unique UNIQUE(email),
  CONSTRAINT leads_phone_unique UNIQUE(phone)
);

CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_franchise ON leads(franchise_interest) WHERE franchise_interest = TRUE;
CREATE INDEX idx_leads_origin ON leads(origin);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);

-- 5. Moderation Log Table
CREATE TABLE moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  moderator_id UUID REFERENCES admin_users(id),
  action moderation_action NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_moderation_photo ON moderation_log(photo_id);
CREATE INDEX idx_moderation_moderator ON moderation_log(moderator_id);
CREATE INDEX idx_moderation_created_at ON moderation_log(created_at DESC);
CREATE INDEX idx_moderation_action ON moderation_log(action);

-- 6. Screens Table
CREATE TABLE screens (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status screen_status DEFAULT 'offline',
  last_ping TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screens_status ON screens(status);

-- 7. Screen Queue Table
CREATE TABLE screen_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  screen_id VARCHAR(50) REFERENCES screens(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  displayed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_screen ON screen_queue(screen_id, position);
CREATE INDEX idx_queue_pending ON screen_queue(screen_id, position) WHERE displayed_at IS NULL;
CREATE INDEX idx_queue_photo ON screen_queue(photo_id);

-- 8. Blocked Users Table
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255),
  phone VARCHAR(20),
  reason TEXT,
  blocked_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocked_email ON blocked_users(email);
CREATE INDEX idx_blocked_phone ON blocked_users(phone);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-approve photographer photos (bypass moderation)
CREATE OR REPLACE FUNCTION auto_approve_photographer_photos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'photographer' AND NEW.photographer_id IS NOT NULL THEN
    NEW.status := 'approved';
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_approve_photographer
  BEFORE INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_photographer_photos();

-- Auto-add approved photos to screen queue
CREATE OR REPLACE FUNCTION add_to_screen_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  screen_record RECORD;
  max_position INTEGER;
BEGIN
  -- Only add if photo was just approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    -- Add to all online screens
    FOR screen_record IN SELECT id FROM screens WHERE status = 'online'
    LOOP
      -- Get max position for this screen
      SELECT COALESCE(MAX(position), 0) INTO max_position
      FROM screen_queue
      WHERE screen_id = screen_record.id AND displayed_at IS NULL;

      -- Insert into queue
      INSERT INTO screen_queue (photo_id, screen_id, position)
      VALUES (NEW.id, screen_record.id, max_position + 1);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_add_to_queue
  AFTER INSERT OR UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION add_to_screen_queue();

-- Update approved_at timestamp when photo is approved
CREATE OR REPLACE FUNCTION update_approved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_approved_at
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_approved_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- PHOTOGRAPHERS policies
CREATE POLICY "Photographers can view own profile"
  ON photographers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert photographers"
  ON photographers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all photographers"
  ON photographers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ADMIN_USERS policies
CREATE POLICY "Admin users can view own profile"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all admin users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- PHOTOS policies
CREATE POLICY "Anyone can view approved photos"
  ON photos FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Photographers can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (
    source = 'photographer' AND
    EXISTS (
      SELECT 1 FROM photographers
      WHERE id = photographer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert user photos"
  ON photos FOR INSERT
  WITH CHECK (source = 'user');

CREATE POLICY "Moderators can view all photos"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can update photo status"
  ON photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- LEADS policies
CREATE POLICY "Anyone can create leads"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view all leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Moderators can view leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- MODERATION_LOG policies
CREATE POLICY "Moderators can insert moderation logs"
  ON moderation_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can view moderation logs"
  ON moderation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- SCREENS policies
CREATE POLICY "Anyone can view online screens"
  ON screens FOR SELECT
  USING (status = 'online');

CREATE POLICY "Admin can manage screens"
  ON screens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- SCREEN_QUEUE policies
CREATE POLICY "Anyone can view screen queue"
  ON screen_queue FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage screen queue"
  ON screen_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- BLOCKED_USERS policies
CREATE POLICY "Moderators can view blocked users"
  ON blocked_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can block users"
  ON blocked_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for photos bucket
CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can upload photos to user folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'user'
  );

CREATE POLICY "Photographers can upload to photographer folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'photographer'
    AND EXISTS (
      SELECT 1 FROM photographers
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- SEED DATA FOR SCREENS
-- =====================================================

-- Insert default screens
INSERT INTO screens (id, name, status) VALUES
  ('henco-main', 'Henco Principal', 'offline'),
  ('keepit-1', 'Keepit Stand 1', 'offline'),
  ('keepit-2', 'Keepit Stand 2', 'offline'),
  ('renko-1', 'Renko 1', 'offline');
