/**
 * @file supabaseClient.ts
 * @description Browser-side Supabase client singleton for use in Client Components.
 *
 * Uses `createBrowserClient` from `@supabase/ssr` which is the recommended
 * approach for Next.js App Router applications. This client automatically
 * handles cookie-based auth token storage in the browser.
 *
 * // TODO: MIGRATE TO BACKEND — In Phase 2, all direct Supabase calls from
 * Client Components should be replaced with API calls to the Spring Boot backend.
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton Supabase client for browser-side usage.
 *
 * @remarks
 * - Only use this in files marked with `"use client"`.
 * - For Server Actions and Server Components, use `createSupabaseServerClient`
 *   from `@/lib/supabaseServer` instead.
 * - The `NEXT_PUBLIC_` prefix ensures these env vars are bundled into the client.
 *
 * @returns A configured Supabase client instance
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
