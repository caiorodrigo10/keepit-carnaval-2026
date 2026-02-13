import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import type { UserRole } from "@/types/database";

/**
 * Route protection configuration for admin/moderator routes
 */
const ADMIN_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin/dashboard": ["admin"],
  "/admin/leads": ["admin"],
  "/admin/screens": ["admin"],
  "/admin/settings": ["admin"],
  "/moderacao": ["admin", "moderator"],
};

/**
 * Check if a route requires authentication
 */
function isProtectedAdminRoute(pathname: string): boolean {
  // Admin routes (except login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return true;
  }
  // Moderacao routes
  if (pathname.startsWith("/moderacao")) {
    return true;
  }
  return false;
}

/**
 * Get allowed roles for a specific path
 */
function getAllowedRoles(pathname: string): UserRole[] | null {
  // Check exact match first
  if (ADMIN_ROUTE_PERMISSIONS[pathname]) {
    return ADMIN_ROUTE_PERMISSIONS[pathname];
  }

  // Check prefix match
  for (const [route, roles] of Object.entries(ADMIN_ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return roles;
    }
  }

  // Default: any authenticated admin user can access
  return null;
}

/**
 * Middleware configuration for Supabase auth session management.
 * Handles route protection for admin portals.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if it exists
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ========================================
  // ADMIN/MODERATOR ROUTE PROTECTION
  // ========================================
  if (isProtectedAdminRoute(pathname)) {
    // Check if user is authenticated
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is an admin user and get their role
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!adminUser) {
      // Not an admin user, sign out and redirect to login
      await supabase.auth.signOut();
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check role-based access
    const allowedRoles = getAllowedRoles(pathname);
    if (allowedRoles && !allowedRoles.includes(adminUser.role as UserRole)) {
      // Insufficient permissions
      // Admin always has access, moderator only to /moderacao
      if (adminUser.role === "admin") {
        // Admin can access everything
      } else if (adminUser.role === "moderator") {
        // Moderator can only access /moderacao
        const moderacaoUrl = new URL("/moderacao", request.url);
        return NextResponse.redirect(moderacaoUrl);
      } else {
        const loginUrl = new URL("/admin/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ========================================
  // ADMIN LOGIN REDIRECT (if already authenticated)
  // ========================================
  if (pathname === "/admin/login" && user) {
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (adminUser) {
      // Redirect based on role
      const redirectPath =
        adminUser.role === "admin"
          ? "/admin/dashboard"
          : "/moderacao";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
