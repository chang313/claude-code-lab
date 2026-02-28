"use client";

import { usePathname } from "next/navigation";
import AuthCacheGuard from "./AuthCacheGuard";
import BottomNav from "./BottomNav";
import ImportBanner from "./ImportBanner";
import OfflineBanner from "./OfflineBanner";
import TopBar from "./TopBar";
import { ImportStatusProvider } from "@/contexts/ImportStatusContext";

export default function AuthLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <ImportStatusProvider>
      <AuthCacheGuard />
      {!isLoginPage && <OfflineBanner />}
      {!isLoginPage && <TopBar />}
      {!isLoginPage && <ImportBanner />}
      <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
      {!isLoginPage && <BottomNav />}
    </ImportStatusProvider>
  );
}
