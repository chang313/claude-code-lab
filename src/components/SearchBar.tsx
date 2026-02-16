"use client";

import { useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({
  placeholder = "Search restaurants...",
  onSearch,
  isLoading = false,
}: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-label="Search restaurants"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500"
        aria-label="Search"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </button>
    </form>
  );
}
