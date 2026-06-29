import { createServerClient as _createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { SUPABASE_NOT_CONFIGURED, type SupabaseHealthState } from "./health";

export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      status: SUPABASE_NOT_CONFIGURED as SupabaseHealthState,
      client: null,
    };
  }

  const client = _createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return { status: "CONFIGURED" as SupabaseHealthState, client };
}
