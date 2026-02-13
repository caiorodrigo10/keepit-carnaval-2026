import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";

/**
 * Admin index page - redirects to appropriate dashboard based on role
 */
export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Redirect based on role
  if (session.role === "admin") {
    redirect("/admin/dashboard");
  } else if (session.role === "moderator") {
    redirect("/moderacao");
  } else {
    redirect("/fotografo/upload");
  }
}
