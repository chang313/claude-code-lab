"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen -mt-4 px-4">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Restaurant Wishlist</h1>
        <p className="text-gray-500">
          Log in to save and sync your restaurant wishlist
        </p>
        <button
          onClick={handleKakaoLogin}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#FEE500] text-[#191919] font-semibold rounded-xl hover:bg-[#FDD835] active:bg-[#FBC02D] transition-colors"
        >
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
          Log in with Kakao
        </button>
      </div>
    </div>
  );
}
