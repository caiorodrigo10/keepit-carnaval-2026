"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import type { Screen, Photo, ScreenStatus } from "@/types/database";

/**
 * Screen control action result
 */
interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Screen with queue info
 */
export interface ScreenWithQueue extends Screen {
  queueCount: number;
  currentPhoto: Photo | null;
}

/**
 * Queue item with photo details
 */
export interface QueueItem {
  id: string;
  photo_id: string | null;
  screen_id: string | null;
  position: number;
  displayed_at: string | null;
  created_at: string;
  photo: Photo;
}

/**
 * Screen queue stats
 */
export interface ScreenQueueStats {
  totalPhotos: number;
  photographerPhotos: number;
  userPhotos: number;
  photographerPercentage: number;
  userPercentage: number;
}

/**
 * Get all screens with their queue info
 */
export async function getScreensWithQueue(): Promise<ScreenWithQueue[]> {
  const supabase = await createClient();

  // Get all screens
  const { data: screens, error: screensError } = await supabase
    .from("screens")
    .select("*")
    .order("name");

  if (screensError || !screens) {
    return [];
  }

  // Get queue counts for each screen
  const screensWithQueue: ScreenWithQueue[] = await Promise.all(
    screens.map(async (screen) => {
      const { count } = await supabase
        .from("screen_queue")
        .select("*", { count: "exact", head: true })
        .eq("screen_id", screen.id);

      // Get current photo (position 0)
      const { data: queueItem } = await supabase
        .from("screen_queue")
        .select("photo_id, photos(*)")
        .eq("screen_id", screen.id)
        .eq("position", 0)
        .single();

      return {
        ...screen,
        queueCount: count || 0,
        currentPhoto: queueItem?.photos as Photo | null,
      };
    })
  );

  return screensWithQueue;
}

/**
 * Get queue items for a specific screen
 */
export async function getScreenQueue(
  screenId: string,
  limit: number = 20
): Promise<QueueItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("screen_queue")
    .select("*, photo:photos(*)")
    .eq("screen_id", screenId)
    .order("position", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    ...item,
    photo: item.photo as Photo,
  }));
}

/**
 * Get queue stats for a screen (photographer vs user ratio)
 */
export async function getScreenQueueStats(
  screenId: string
): Promise<ScreenQueueStats> {
  const supabase = await createClient();

  // Get all queue items with photo source
  const { data } = await supabase
    .from("screen_queue")
    .select("photo:photos(source)")
    .eq("screen_id", screenId);

  if (!data || data.length === 0) {
    return {
      totalPhotos: 0,
      photographerPhotos: 0,
      userPhotos: 0,
      photographerPercentage: 0,
      userPercentage: 0,
    };
  }

  const total = data.length;
  const photographerCount = data.filter(
    (item) => (item.photo as { source: string })?.source === "photographer"
  ).length;
  const userCount = total - photographerCount;

  return {
    totalPhotos: total,
    photographerPhotos: photographerCount,
    userPhotos: userCount,
    photographerPercentage: total > 0 ? Math.round((photographerCount / total) * 100) : 0,
    userPercentage: total > 0 ? Math.round((userCount / total) * 100) : 0,
  };
}

/**
 * Skip (remove) current photo from queue and advance
 */
export async function skipCurrentPhoto(screenId: string): Promise<ActionResult> {
  try {
    await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Get current photo (position 0)
    const { data: currentItem, error: fetchError } = await supabase
      .from("screen_queue")
      .select("id")
      .eq("screen_id", screenId)
      .eq("position", 0)
      .single();

    if (fetchError || !currentItem) {
      return { success: false, error: "Nenhuma foto na fila" };
    }

    // Delete current item
    const { error: deleteError } = await supabase
      .from("screen_queue")
      .delete()
      .eq("id", currentItem.id);

    if (deleteError) {
      return { success: false, error: "Erro ao pular foto" };
    }

    // Update positions (decrement all by 1)
    const { data: remaining } = await supabase
      .from("screen_queue")
      .select("id, position")
      .eq("screen_id", screenId)
      .order("position");

    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from("screen_queue")
          .update({ position: i })
          .eq("id", remaining[i].id);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Remove a specific photo from the queue
 */
export async function removeFromQueue(
  screenId: string,
  queueItemId: string
): Promise<ActionResult> {
  try {
    await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Get the item's position
    const { data: item, error: fetchError } = await supabase
      .from("screen_queue")
      .select("position")
      .eq("id", queueItemId)
      .single();

    if (fetchError || !item) {
      return { success: false, error: "Item nao encontrado" };
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from("screen_queue")
      .delete()
      .eq("id", queueItemId);

    if (deleteError) {
      return { success: false, error: "Erro ao remover foto" };
    }

    // Update positions for items after the removed one
    const { data: remaining } = await supabase
      .from("screen_queue")
      .select("id, position")
      .eq("screen_id", screenId)
      .gt("position", item.position)
      .order("position");

    if (remaining) {
      for (const r of remaining) {
        await supabase
          .from("screen_queue")
          .update({ position: r.position - 1 })
          .eq("id", r.id);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Add a photo to the queue
 */
export async function addToQueue(
  screenId: string,
  photoId: string,
  position?: number
): Promise<ActionResult> {
  try {
    await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Check if photo is already in queue
    const { data: existing } = await supabase
      .from("screen_queue")
      .select("id")
      .eq("screen_id", screenId)
      .eq("photo_id", photoId)
      .single();

    if (existing) {
      return { success: false, error: "Foto ja esta na fila" };
    }

    // Get current max position
    const { data: maxItem } = await supabase
      .from("screen_queue")
      .select("position")
      .eq("screen_id", screenId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const newPosition = position ?? (maxItem ? maxItem.position + 1 : 0);

    // If inserting at specific position, shift others
    if (position !== undefined && maxItem) {
      const { data: toShift } = await supabase
        .from("screen_queue")
        .select("id, position")
        .eq("screen_id", screenId)
        .gte("position", position)
        .order("position", { ascending: false });

      if (toShift) {
        for (const item of toShift) {
          await supabase
            .from("screen_queue")
            .update({ position: item.position + 1 })
            .eq("id", item.id);
        }
      }
    }

    // Insert new item
    const { error: insertError } = await supabase.from("screen_queue").insert({
      screen_id: screenId,
      photo_id: photoId,
      position: newPosition,
    });

    if (insertError) {
      return { success: false, error: "Erro ao adicionar foto" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Reorder queue item (move to new position)
 */
export async function reorderQueueItem(
  screenId: string,
  queueItemId: string,
  newPosition: number
): Promise<ActionResult> {
  try {
    await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Get current position
    const { data: item, error: fetchError } = await supabase
      .from("screen_queue")
      .select("position")
      .eq("id", queueItemId)
      .single();

    if (fetchError || !item) {
      return { success: false, error: "Item nao encontrado" };
    }

    const oldPosition = item.position;

    if (oldPosition === newPosition) {
      return { success: true };
    }

    // Shift items between old and new positions
    if (newPosition < oldPosition) {
      // Moving up: shift items down
      const { data: toShift } = await supabase
        .from("screen_queue")
        .select("id, position")
        .eq("screen_id", screenId)
        .gte("position", newPosition)
        .lt("position", oldPosition)
        .order("position", { ascending: false });

      if (toShift) {
        for (const s of toShift) {
          await supabase
            .from("screen_queue")
            .update({ position: s.position + 1 })
            .eq("id", s.id);
        }
      }
    } else {
      // Moving down: shift items up
      const { data: toShift } = await supabase
        .from("screen_queue")
        .select("id, position")
        .eq("screen_id", screenId)
        .gt("position", oldPosition)
        .lte("position", newPosition)
        .order("position", { ascending: true });

      if (toShift) {
        for (const s of toShift) {
          await supabase
            .from("screen_queue")
            .update({ position: s.position - 1 })
            .eq("id", s.id);
        }
      }
    }

    // Update item position
    const { error: updateError } = await supabase
      .from("screen_queue")
      .update({ position: newPosition })
      .eq("id", queueItemId);

    if (updateError) {
      return { success: false, error: "Erro ao reordenar fila" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Pause/resume a screen
 */
export async function toggleScreenPause(
  screenId: string
): Promise<ActionResult & { newStatus?: ScreenStatus }> {
  try {
    await requireAuth(["admin", "moderator"]);
    const supabase = await createClient();

    // Get current status
    const { data: screen, error: fetchError } = await supabase
      .from("screens")
      .select("status")
      .eq("id", screenId)
      .single();

    if (fetchError || !screen) {
      return { success: false, error: "Telao nao encontrado" };
    }

    const newStatus: ScreenStatus =
      screen.status === "paused" ? "online" : "paused";

    const { error: updateError } = await supabase
      .from("screens")
      .update({ status: newStatus })
      .eq("id", screenId);

    if (updateError) {
      return { success: false, error: "Erro ao alterar status" };
    }

    return { success: true, newStatus };
  } catch {
    return { success: false, error: "Erro de autenticacao" };
  }
}

/**
 * Update screen status (for heartbeat)
 */
export async function updateScreenStatus(
  screenId: string,
  status: ScreenStatus
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("screens")
    .update({
      status,
      last_ping: new Date().toISOString(),
    })
    .eq("id", screenId);

  if (error) {
    return { success: false, error: "Erro ao atualizar status" };
  }

  return { success: true };
}

/**
 * Get approved photos available to add to queue
 */
export async function getAvailablePhotos(
  screenId: string,
  limit: number = 50
): Promise<Photo[]> {
  const supabase = await createClient();

  // Get photo IDs already in queue for this screen
  const { data: queueItems } = await supabase
    .from("screen_queue")
    .select("photo_id")
    .eq("screen_id", screenId);

  const queuedPhotoIds = queueItems?.map((item) => item.photo_id) || [];

  // Get approved photos not in queue
  let query = supabase
    .from("photos")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(limit);

  if (queuedPhotoIds.length > 0) {
    query = query.not("id", "in", `(${queuedPhotoIds.join(",")})`);
  }

  const { data } = await query;

  return data || [];
}

/**
 * Get global screen stats
 */
export async function getGlobalScreenStats(): Promise<{
  totalScreens: number;
  onlineScreens: number;
  pausedScreens: number;
  offlineScreens: number;
  totalPhotosInQueue: number;
}> {
  const supabase = await createClient();

  const { data: screens } = await supabase.from("screens").select("status");

  const { count: queueCount } = await supabase
    .from("screen_queue")
    .select("*", { count: "exact", head: true });

  const totalScreens = screens?.length || 0;
  const onlineScreens = screens?.filter((s) => s.status === "online").length || 0;
  const pausedScreens = screens?.filter((s) => s.status === "paused").length || 0;
  const offlineScreens = screens?.filter((s) => s.status === "offline").length || 0;

  return {
    totalScreens,
    onlineScreens,
    pausedScreens,
    offlineScreens,
    totalPhotosInQueue: queueCount || 0,
  };
}
