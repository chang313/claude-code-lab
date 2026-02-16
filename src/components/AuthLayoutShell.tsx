"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";

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
      <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
      {!isLoginPage && <BottomNav />}
    </>
  );
}
