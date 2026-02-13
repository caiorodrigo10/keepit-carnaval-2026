"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import type { ModerationAction } from "@/types/database";

/**
 * Moderation action result
 */
interface ModerationResult {
  success: boolean;
  error?: string;
}

/**
 * Approve a photo - updates status and logs action
 */
export async function approvePhoto(photoId: string): Promise<ModerationResult> {
  try {
    const session = await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Update photo status
    const { error: updateError } = await supabase
      .from("photos")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", photoId)
      .eq("status", "pending");

    if (updateError) {
      return { success: false, error: "Erro ao aprovar foto" };
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      photo_id: photoId,
      moderator_id: session.id,
      action: "approved" as ModerationAction,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Reject a photo - updates status and logs action
 */
export async function rejectPhoto(
  photoId: string,
  reason?: string
): Promise<ModerationResult> {
  try {
    const session = await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Update photo status
    const { error: updateError } = await supabase
      .from("photos")
      .update({ status: "rejected" })
      .eq("id", photoId)
      .eq("status", "pending");

    if (updateError) {
      return { success: false, error: "Erro ao rejeitar foto" };
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      photo_id: photoId,
      moderator_id: session.id,
      action: "rejected" as ModerationAction,
      reason,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Block a user by email - also rejects all their pending photos
 */
export async function blockUser(
  photoId: string,
  reason?: string
): Promise<ModerationResult> {
  try {
    const session = await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Get photo to find user email
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("user_email")
      .eq("id", photoId)
      .single();

    if (photoError || !photo?.user_email) {
      return { success: false, error: "Foto nao encontrada ou sem email de usuario" };
    }

    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("email", photo.user_email)
      .single();

    if (!existingBlock) {
      // Add to blocked users
      await supabase.from("blocked_users").insert({
        email: photo.user_email,
        reason,
        blocked_by: session.id,
      });
    }

    // Reject all pending photos from this user
    const { error: updateError } = await supabase
      .from("photos")
      .update({ status: "rejected" })
      .eq("user_email", photo.user_email)
      .eq("status", "pending");

    if (updateError) {
      return { success: false, error: "Erro ao bloquear usuario" };
    }

    // Log moderation action
    await supabase.from("moderation_log").insert({
      photo_id: photoId,
      moderator_id: session.id,
      action: "blocked" as ModerationAction,
      reason,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Batch approve multiple photos
 */
export async function batchApprovePhotos(
  photoIds: string[]
): Promise<ModerationResult> {
  try {
    const session = await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Update all photos status
    const { error: updateError } = await supabase
      .from("photos")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .in("id", photoIds)
      .eq("status", "pending");

    if (updateError) {
      return { success: false, error: "Erro ao aprovar fotos" };
    }

    // Log moderation actions
    const logs = photoIds.map((photoId) => ({
      photo_id: photoId,
      moderator_id: session.id,
      action: "approved" as ModerationAction,
    }));

    await supabase.from("moderation_log").insert(logs);

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Batch reject multiple photos
 */
export async function batchRejectPhotos(
  photoIds: string[],
  reason?: string
): Promise<ModerationResult> {
  try {
    const session = await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Update all photos status
    const { error: updateError } = await supabase
      .from("photos")
      .update({ status: "rejected" })
      .in("id", photoIds)
      .eq("status", "pending");

    if (updateError) {
      return { success: false, error: "Erro ao rejeitar fotos" };
    }

    // Log moderation actions
    const logs = photoIds.map((photoId) => ({
      photo_id: photoId,
      moderator_id: session.id,
      action: "rejected" as ModerationAction,
      reason,
    }));

    await supabase.from("moderation_log").insert(logs);

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Get moderation stats for the current day
 */
export async function getModerationStats(): Promise<{
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}> {
  const supabase = await createClient();

  // Get today's start timestamp
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get pending count
  const { count: pendingCount } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Get approved today count
  const { count: approvedCount } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "approved")
    .gte("created_at", todayStart.toISOString());

  // Get rejected today count
  const { count: rejectedCount } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .in("action", ["rejected", "blocked"])
    .gte("created_at", todayStart.toISOString());

  return {
    pending: pendingCount ?? 0,
    approvedToday: approvedCount ?? 0,
    rejectedToday: rejectedCount ?? 0,
  };
}
