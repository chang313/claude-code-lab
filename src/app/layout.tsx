import type { Metadata, Viewport } from "next";
import "./globals.css";
import KakaoScript from "@/components/KakaoScript";
import AuthLayoutShell from "@/components/AuthLayoutShell";

export const metadata: Metadata = {
  title: "Restaurant Wishlist",
  description: "Save and organize your restaurant wishlist by menu items",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen pb-16">
        <KakaoScript />
        <AuthLayoutShell>{children}</AuthLayoutShell>
      </body>
    </html>
  );
}
