import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Handle OAuth error response from provider
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const description = searchParams.get("error_description") ?? "";
    console.error("[auth/callback] OAuth error:", oauthError, description);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "oauth_error");
    if (description) loginUrl.searchParams.set("message", description);
    return NextResponse.redirect(loginUrl.toString());
  }

  if (code) {
    const cookieStore = await cookies();
    // Collect cookies so we can apply them to the redirect response
    const pendingCookies: Array<{
      name: string;
      value: string;
      options: CookieOptions;
    }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            pendingCookies.push(...cookiesToSet);
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // May fail in certain contexts — cookies are applied to
                // the redirect response below as the primary mechanism.
              }
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Auto-create/update profile from Kakao OAuth metadata
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata ?? {};
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            display_name:
              meta.name || meta.full_name || meta.user_name || "User",
            avatar_url: meta.avatar_url || meta.picture || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      }

      const redirectUrl = getRedirectUrl(request, origin, next);
      const response = NextResponse.redirect(redirectUrl);
      // Apply auth cookies directly to the redirect response
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.error("[auth/callback] Code exchange failed:", error.message);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "exchange_failed");
    return NextResponse.redirect(loginUrl.toString());
  }

  // No code and no error — unexpected state
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "unknown");
  return NextResponse.redirect(loginUrl.toString());
}

/** Use x-forwarded-host on Vercel to get the real public origin. */
function getRedirectUrl(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  if (!isLocal && forwardedHost) {
    return `https://${forwardedHost}${path}`;
  }
  return `${origin}${path}`;
}
