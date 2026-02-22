"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shareService, shareProfile } from "@/lib/kakao-share";

interface ShareButtonProps {
  type: "service" | "profile";
  userId?: string;
  displayName?: string;
  wishlistCount?: number;
  onResult: (result: { message: string; type: "success" | "error" }) => void;
}

export default function ShareButton({
  type,
  userId,
  displayName,
  wishlistCount,
  onResult,
}: ShareButtonProps) {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    if (isSharing) return;

    const {
      data: { user },
    } = await createClient().auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setIsSharing(true);
    try {
      const result =
        type === "profile" && userId && displayName !== undefined
          ? await shareProfile(userId, displayName, wishlistCount ?? 0)
          : await shareService();

      if (result.method === "clipboard") {
        onResult({ message: "링크가 복사되었습니다", type: "success" });
      } else if (result.method === "error") {
        onResult({ message: "링크 복사에 실패했습니다", type: "error" });
      }
      // method === "kakao": Kakao handles its own dialog — no toast needed
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      aria-label="공유하기"
      className={`p-2 text-gray-600 hover:text-gray-900 ${isSharing ? "opacity-50 pointer-events-none" : ""}`}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </button>
  );
}
