import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for browser/client-side usage.
 * Use this in React components and hooks.
 *
 * Example:
 * ```ts
 * const supabase = createClient();
 * const { data } = await supabase.from('photos').select('*');
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
