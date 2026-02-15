import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import OfflineBanner from "@/components/OfflineBanner";

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
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`}
          strategy="beforeInteractive"
        />
        <OfflineBanner />
        <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
