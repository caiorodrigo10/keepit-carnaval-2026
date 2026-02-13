-- Keepit Carnaval 2026 - AI Photo Generation Tables
-- Migration: ai_photo_tables
-- Created: 2026-02-06

-- =====================================================
-- ENUM TYPE
-- =====================================================

CREATE TYPE ai_generation_status AS ENUM (
  'uploading',
  'queued',
  'processing',
  'copying',
  'completed',
  'failed',
  'expired'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Templates de foto com IA
CREATE TABLE ai_photo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT NOT NULL,
  template_image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '3:4',
  resolution TEXT DEFAULT '1K',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_active ON ai_photo_templates(is_active, sort_order);

-- Geracoes de fotos com IA
CREATE TABLE ai_photo_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES ai_photo_templates(id),
  status ai_generation_status DEFAULT 'uploading',

  -- Fotos de referencia (URLs no Supabase Storage)
  reference_photos TEXT[] NOT NULL DEFAULT '{}',

  -- Variante 1
  variant_1_url TEXT,
  variant_1_fal_request_id TEXT,
  variant_1_status TEXT DEFAULT 'pending',

  -- Variante 2
  variant_2_url TEXT,
  variant_2_fal_request_id TEXT,
  variant_2_status TEXT DEFAULT 'pending',

  -- Variante 3
  variant_3_url TEXT,
  variant_3_fal_request_id TEXT,
  variant_3_status TEXT DEFAULT 'pending',

  -- Metadados
  error_message TEXT,
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_generations_lead ON ai_photo_generations(lead_id);
CREATE INDEX idx_generations_status ON ai_photo_generations(status);
CREATE INDEX idx_generations_created ON ai_photo_generations(created_at DESC);
CREATE INDEX idx_generations_fal_v1 ON ai_photo_generations(variant_1_fal_request_id) WHERE variant_1_fal_request_id IS NOT NULL;
CREATE INDEX idx_generations_fal_v2 ON ai_photo_generations(variant_2_fal_request_id) WHERE variant_2_fal_request_id IS NOT NULL;
CREATE INDEX idx_generations_fal_v3 ON ai_photo_generations(variant_3_fal_request_id) WHERE variant_3_fal_request_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ai_photo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_photo_generations ENABLE ROW LEVEL SECURITY;

-- Templates: leitura publica (todos podem ver os ativos)
CREATE POLICY "Templates visiveis publicamente"
  ON ai_photo_templates FOR SELECT
  USING (is_active = true);

-- Templates: admin pode tudo
CREATE POLICY "Admin gerencia templates"
  ON ai_photo_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Generations: anon pode criar (lead-based auth, sem supabase auth)
CREATE POLICY "Anon pode criar generation"
  ON ai_photo_generations FOR INSERT
  WITH CHECK (true);

-- Generations: anon pode ler (para polling de status)
CREATE POLICY "Anon pode ler generations"
  ON ai_photo_generations FOR SELECT
  USING (true);

-- Generations: anon pode atualizar (para webhook e status updates via API)
CREATE POLICY "Anon pode atualizar generation"
  ON ai_photo_generations FOR UPDATE
  USING (true);

-- Generations: admin pode tudo
CREATE POLICY "Admin gerencia generations"
  ON ai_photo_generations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- STORAGE BUCKET: ai-photos
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-photos',
  'ai-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Leitura publica
CREATE POLICY "AI photos publicamente legiveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-photos');

-- Anon pode upload na pasta references/
CREATE POLICY "Anon pode upload de referencias"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-photos'
    AND (storage.foldername(name))[1] = 'references'
  );

-- Anon pode upload na pasta generated/ (para webhook copiar resultados)
CREATE POLICY "Upload de fotos geradas"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-photos'
    AND (storage.foldername(name))[1] = 'generated'
  );

-- Anon pode sobrescrever na pasta generated/ (upsert)
CREATE POLICY "Upsert de fotos geradas"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'ai-photos'
    AND (storage.foldername(name))[1] = 'generated'
  );

-- =====================================================
-- SEED: Templates iniciais (5 modelos reais)
-- =====================================================

INSERT INTO ai_photo_templates (slug, name, description, preview_url, template_image_url, prompt, aspect_ratio, sort_order) VALUES
(
  'bateria-percussao',
  'Bateria',
  'Toque na bateria do desfile com o grupo todo de branco',
  '/modeloskeepit/keepittemplate1.jpg',
  '/modeloskeepit/keepittemplate1.jpg',
  'You are given a template photo and reference photos of a person. Your task: recreate the exact same image as the template photo, but replace the face with the person from the reference photos.

Rules:
- Keep the EXACT same pose, clothing, background, lighting, and composition as the template photo
- Only replace the face/head with the person from the reference photos
- Preserve the person''s exact facial features, skin tone, face shape, hair texture, and hair color
- The result must look like a real photograph, not AI-generated
- Match the lighting and color grading of the template photo on the person''s face
- Do not change anything else in the scene',
  '3:2',
  1
),
(
  'rainha-bateria',
  'Rainha de Bateria',
  'Brilhe como rainha de bateria com coroa e fantasia pink',
  '/modeloskeepit/keepittemplate2.jpg',
  '/modeloskeepit/keepittemplate2.jpg',
  'You are given a template photo and reference photos of a person. Your task: recreate the exact same image as the template photo, but replace the face with the person from the reference photos.

Rules:
- Keep the EXACT same pose, clothing, background, lighting, and composition as the template photo
- Only replace the face/head with the person from the reference photos
- Preserve the person''s exact facial features, skin tone, face shape, hair texture, and hair color
- The result must look like a real photograph, not AI-generated
- Match the lighting and color grading of the template photo on the person''s face
- Do not change anything else in the scene',
  '3:2',
  2
),
(
  'rainha-close',
  'Rainha Close-up',
  'Retrato aproximado com coroa de cristais e fantasia brilhante',
  '/modeloskeepit/keepittemplate3.jpg',
  '/modeloskeepit/keepittemplate3.jpg',
  'You are given a template photo and reference photos of a person. Your task: recreate the exact same image as the template photo, but replace the face with the person from the reference photos.

Rules:
- Keep the EXACT same pose, clothing, background, lighting, and composition as the template photo
- Only replace the face/head with the person from the reference photos
- Preserve the person''s exact facial features, skin tone, face shape, hair texture, and hair color
- The result must look like a real photograph, not AI-generated
- Match the lighting and color grading of the template photo on the person''s face
- Do not change anything else in the scene',
  '3:2',
  3
),
(
  'musa-carnaval',
  'Musa do Carnaval',
  'Pose de musa com roupa brilhante e cenário dourado',
  '/modeloskeepit/keepittemplate4.jpg',
  '/modeloskeepit/keepittemplate4.jpg',
  'You are given a template photo and reference photos of a person. Your task: recreate the exact same image as the template photo, but replace the face with the person from the reference photos.

Rules:
- Keep the EXACT same pose, clothing, background, lighting, and composition as the template photo
- Only replace the face/head with the person from the reference photos
- Preserve the person''s exact facial features, skin tone, face shape, hair texture, and hair color
- The result must look like a real photograph, not AI-generated
- Match the lighting and color grading of the template photo on the person''s face
- Do not change anything else in the scene',
  '3:2',
  4
),
(
  'musa-close',
  'Musa Close-up',
  'Retrato aproximado de musa com batom vermelho e brilho',
  '/modeloskeepit/keepittemplate5.jpg',
  '/modeloskeepit/keepittemplate5.jpg',
  'You are given a template photo and reference photos of a person. Your task: recreate the exact same image as the template photo, but replace the face with the person from the reference photos.

Rules:
- Keep the EXACT same pose, clothing, background, lighting, and composition as the template photo
- Only replace the face/head with the person from the reference photos
- Preserve the person''s exact facial features, skin tone, face shape, hair texture, and hair color
- The result must look like a real photograph, not AI-generated
- Match the lighting and color grading of the template photo on the person''s face
- Do not change anything else in the scene',
  '3:2',
  5
);
