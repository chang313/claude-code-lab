"use client";

import { useState, type ReactNode } from "react";

interface CategoryAccordionProps {
  subcategory: string;
  count: number;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export default function CategoryAccordion({
  subcategory,
  count,
  children,
  defaultExpanded = true,
}: CategoryAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{subcategory}</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {count}
          </span>
        </div>
        <span
          className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {isExpanded && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}
