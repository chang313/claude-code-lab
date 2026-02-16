"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const meta = user?.user_metadata ?? {};
  const nickname = meta.name || meta.full_name || meta.user_name || "User";
  const email = user?.email || meta.email || "";
  const avatarUrl = meta.avatar_url || meta.picture || "";

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold mb-6">My Info</h1>

      <div className="flex flex-col items-center gap-4 py-8">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nickname}
            className="w-20 h-20 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
            👤
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">{nickname}</p>
          {email && <p className="text-sm text-gray-500">{email}</p>}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full mt-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
