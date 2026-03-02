import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PATHS = new Set([
  "/en", "/ko", "/zh",
  "/en/planner", "/ko/planner", "/zh/planner",
  "/en/account", "/ko/account", "/zh/account",
]);

function safeRedirectPath(next: string | null): string {
  if (!next) return "/en/planner";
  // Must start with / and be in allowlist (prevent open redirect)
  if (next.startsWith("/") && ALLOWED_PATHS.has(next)) return next;
  return "/en/planner";
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/en?error=auth_callback_failed`);
}
