"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  exchange_failed: "Login failed. Please try again.",
  oauth_error: "Authentication was denied or failed.",
  unknown: "An unexpected error occurred.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const errorCode = searchParams.get("error");
    if (!errorCode) return null;
    return (
      ERROR_MESSAGES[errorCode] ??
      searchParams.get("message") ??
      ERROR_MESSAGES.unknown
    );
  });

  // Reset loading state when page is restored from bfcache (e.g. user
  // navigated back after being redirected to Kakao's OAuth page).
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleKakaoLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "profile_nickname profile_image",
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Supabase normally redirects via window.location.assign, but if that
      // didn't happen (e.g. SSR context), fall back to a manual redirect.
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to connect. Please check your network.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen -mt-4 px-4">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Restaurant Wishlist</h1>
        <p className="text-gray-500">
          Log in to save and sync your restaurant wishlist
        </p>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#FEE500] text-[#191919] font-semibold rounded-xl hover:bg-[#FDD835] active:bg-[#FBC02D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 0.5C4.029 0.5 0 3.588 0 7.393C0 9.817 1.558 11.95 3.932 13.186L2.933 16.787C2.845 17.1 3.213 17.35 3.486 17.166L7.733 14.398C8.148 14.441 8.57 14.464 9 14.464C13.971 14.464 18 11.376 18 7.571C18 3.588 13.971 0.5 9 0.5Z"
                fill="#191919"
              />
            </svg>
          )}
          {loading ? "Logging in..." : "Log in with Kakao"}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
