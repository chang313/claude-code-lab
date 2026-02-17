"use client";

interface SearchThisAreaButtonProps {
  visible: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export default function SearchThisAreaButton({
  visible,
  isLoading,
  onClick,
}: SearchThisAreaButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="bg-white shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-800 border border-gray-200 flex items-center gap-2 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 transition-colors"
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          className="w-4 h-4"
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
      이 지역 검색
    </button>
  );
}
