"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MyPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      // Ensure profile exists for users with pre-existing sessions
      const meta = data.user.user_metadata ?? {};
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          display_name:
            meta.name || meta.full_name || meta.user_name || "User",
          avatar_url: meta.avatar_url || meta.picture || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      router.replace(`/users/${data.user.id}`);
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">로딩 중...</p>
    </div>
  );
}
