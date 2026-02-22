"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidateAll } from "@/lib/supabase/invalidate";

export default function AuthCacheGuard() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        invalidateAll();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
