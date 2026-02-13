"use server";

import { createClient } from "@/lib/supabase/server";
import type { AiPhotoGeneration, AiPhotoTemplate, AiGenerationStatus } from "@/types/ai-photo";

/**
 * Get all generations for a lead (history).
 */
export async function getLeadGenerations(
  leadId: string
): Promise<AiPhotoGeneration[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_photo_generations")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as AiPhotoGeneration[];
}

/**
 * Get a single generation by ID.
 */
export async function getGeneration(
  generationId: string
): Promise<AiPhotoGeneration | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_photo_generations")
    .select("*")
    .eq("id", generationId)
    .single();

  return (data ?? null) as AiPhotoGeneration | null;
}

/**
 * Get all active templates.
 */
export async function getActiveTemplates(): Promise<AiPhotoTemplate[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_photo_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data ?? []) as unknown as AiPhotoTemplate[];
}

/**
 * Admin: list all generations with optional filters.
 */
export async function getAllGenerations(filters?: {
  status?: AiGenerationStatus;
  page?: number;
  perPage?: number;
}): Promise<{ data: AiPhotoGeneration[]; total: number }> {
  const supabase = await createClient();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("ai_photo_generations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count } = await query;

  return {
    data: (data ?? []) as unknown as AiPhotoGeneration[],
    total: count ?? 0,
  };
}

/**
 * Admin: toggle template active status.
 */
export async function toggleTemplate(
  templateId: string,
  isActive: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_photo_templates")
    .update({ is_active: isActive })
    .eq("id", templateId);

  if (error) {
    throw new Error(`Erro ao atualizar template: ${error.message}`);
  }
}
