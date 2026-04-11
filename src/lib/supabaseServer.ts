/**
 * @file supabaseServer.ts
 * @description Server-side Supabase client factory for use in Server Actions,
 *              Server Components, and Route Handlers within the Next.js App Router.
 *
 * Uses `createServerClient` from `@supabase/ssr` with the `cookies()` API
 * from `next/headers` to read and write auth cookies on the server.
 *
 * // TODO: MIGRATE TO BACKEND — In Phase 2, direct Supabase calls from Server
 * Actions should be replaced with calls to the Spring Boot backend.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a new Supabase client configured for server-side usage.
 *
 * @remarks
 * - Must be called inside an async context (Server Actions, Route Handlers).
 * - Each call creates a fresh client that reads cookies from the current request.
 * - The `setAll` method is wrapped in try/catch because it throws when called
 *   from Server Components (which are read-only). This is expected and safe
 *   when middleware handles session refresh.
 *
 * @returns A configured Supabase client with server-side cookie access
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(
                    cookiesToSet: {
                        name: string;
                        value: string;
                        options: CookieOptions;
                    }[]
                ) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // setAll was called from a Server Component.
                        // This can be safely ignored if middleware handles session refresh.
                    }
                },
            },
        }
    );
}
