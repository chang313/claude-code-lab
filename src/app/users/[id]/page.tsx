"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import UserProfileView from "@/components/UserProfileView";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const isOwnProfile = currentUserId === id;

  return <UserProfileView userId={id} isOwnProfile={isOwnProfile} />;
}
