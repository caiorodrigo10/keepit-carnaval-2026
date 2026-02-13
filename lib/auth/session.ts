import { createClient } from "@/lib/supabase/server";
import type { AdminSession } from "./types";
import type { UserRole } from "@/types/database";

/**
 * Get the current admin session from the authenticated user.
 * Returns null if not authenticated or not an admin user.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get the admin user data
  const { data: adminUser, error: dbError } = await supabase
    .from("admin_users")
    .select("id, name, email, role")
    .eq("user_id", user.id)
    .single();

  if (dbError || !adminUser) {
    return null;
  }

  return {
    id: adminUser.id,
    userId: user.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role as UserRole,
  };
}

/**
 * Check if the current user has a specific role or higher.
 */
export async function hasRole(
  requiredRoles: UserRole[]
): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) return false;

  // Admin has access to everything
  if (session.role === "admin") return true;

  return requiredRoles.includes(session.role);
}

/**
 * Require authentication and optionally specific roles.
 * Throws an error if not authenticated or insufficient permissions.
 */
export async function requireAuth(
  requiredRoles?: UserRole[]
): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (session.role !== "admin" && !requiredRoles.includes(session.role)) {
      throw new Error("Insufficient permissions");
    }
  }

  return session;
}
