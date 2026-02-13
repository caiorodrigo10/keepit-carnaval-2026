import type { UserRole } from "@/types/database";

/**
 * Admin session with role information
 */
export interface AdminSession {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login result
 */
export interface LoginResult {
  success: boolean;
  error?: string;
  session?: AdminSession;
}

/**
 * Route protection config
 */
export interface RouteProtection {
  path: string;
  allowedRoles: UserRole[];
}

/**
 * Admin routes and their allowed roles
 */
export const PROTECTED_ROUTES: RouteProtection[] = [
  { path: "/admin", allowedRoles: ["admin", "moderator", "photographer"] },
  { path: "/admin/dashboard", allowedRoles: ["admin"] },
  { path: "/admin/leads", allowedRoles: ["admin"] },
  { path: "/admin/screens", allowedRoles: ["admin"] },
  { path: "/admin/settings", allowedRoles: ["admin"] },
  { path: "/moderacao", allowedRoles: ["admin", "moderator"] },
  { path: "/fotografo", allowedRoles: ["admin", "photographer"] },
];

/**
 * Check if a role has access to a specific route
 */
export function hasRouteAccess(role: UserRole, pathname: string): boolean {
  // Admin has access to everything
  if (role === "admin") return true;

  // Find the most specific matching route
  const matchingRoute = PROTECTED_ROUTES.filter((route) =>
    pathname.startsWith(route.path)
  ).sort((a, b) => b.path.length - a.path.length)[0];

  if (!matchingRoute) {
    // No specific route config, allow access if user is authenticated
    return true;
  }

  return matchingRoute.allowedRoles.includes(role);
}
