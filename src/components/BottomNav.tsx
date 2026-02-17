"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Wishlist", icon: "♥" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/my", label: "My", icon: "👤" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto flex justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2 px-3 text-xs ${
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
