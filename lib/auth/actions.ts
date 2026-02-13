"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { LoginResult } from "./types";

/**
 * Server action to handle admin login
 */
export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  const supabase = await createClient();

  // Sign in with Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    return {
      success: false,
      error:
        authError.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : "Erro ao fazer login. Tente novamente.",
    };
  }

  if (!authData.user) {
    return {
      success: false,
      error: "Erro ao fazer login. Tente novamente.",
    };
  }

  // Check if user is an admin user
  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id, name, email, role")
    .eq("user_id", authData.user.id)
    .single();

  if (adminError || !adminUser) {
    // Sign out if not an admin user
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Acesso nao autorizado. Esta conta nao possui permissoes de administrador.",
    };
  }

  return {
    success: true,
    session: {
      id: adminUser.id,
      userId: authData.user.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    },
  };
}

/**
 * Server action to handle admin logout
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
