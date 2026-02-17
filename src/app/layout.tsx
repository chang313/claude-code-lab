import type { Metadata, Viewport } from "next";
import "./globals.css";
import KakaoScript from "@/components/KakaoScript";
import AuthLayoutShell from "@/components/AuthLayoutShell";

export const metadata: Metadata = {
  title: "맛집 리스트",
  description: "맛집을 저장하고 관리하세요",
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
