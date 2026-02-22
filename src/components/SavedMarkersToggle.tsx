"use client";

interface SavedMarkersToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function SavedMarkersToggle({ isVisible, onToggle }: SavedMarkersToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 transition-colors hover:bg-gray-50 active:bg-gray-100"
      aria-label={isVisible ? "저장한 맛집 숨기기" : "저장한 맛집 보기"}
      title={isVisible ? "저장한 맛집 숨기기" : "저장한 맛집 보기"}
    >
      {isVisible ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#3498DB" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-4-7 4V4z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-4-7 4V4z" />
        </svg>
      )}
    </button>
  );
}
