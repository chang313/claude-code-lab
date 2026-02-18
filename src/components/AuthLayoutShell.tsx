"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";
import TopBar from "./TopBar";

export default function AuthLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <>
      {!isLoginPage && <OfflineBanner />}
      {!isLoginPage && <TopBar />}
      <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
      {!isLoginPage && <BottomNav />}
    </>
  );
}
