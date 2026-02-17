"use client";

import { useState, useEffect } from "react";

interface OfflineBannerProps {
  forceOffline?: boolean;
}

export default function OfflineBanner({ forceOffline }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(forceOffline ?? false);

  useEffect(() => {
    if (forceOffline !== undefined) return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [forceOffline]);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-medium"
    >
      오프라인 상태입니다. 모든 기능은 인터넷 연결이 필요합니다.
    </div>
  );
}
