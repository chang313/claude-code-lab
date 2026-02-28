"use client";

import { useImportStatus } from "@/contexts/ImportStatusContext";

function Spinner() {
  return (
    <svg
      className="w-4 h-4 text-white animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="닫기"
      className="ml-2 p-0.5 rounded hover:bg-white/20"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export default function ImportBanner() {
  const { phase, dismiss } = useImportStatus();

  if (phase.status === "idle") return null;

  const config = {
    fetching: {
      bg: "bg-blue-500",
      text: "네이버에서 가져오는 중...",
      spinner: true,
      dismissable: false,
    },
    saving: {
      bg: "bg-blue-500",
      text: `${(phase as { total: number }).total}개 장소 저장 중...`,
      spinner: true,
      dismissable: false,
    },
    enriching: {
      bg: "bg-blue-500",
      text: "카테고리 매칭 중...",
      spinner: true,
      dismissable: false,
    },
    completed: {
      bg: "bg-green-500",
      text: `가져오기 완료! ${(phase as { importedCount: number }).importedCount}개 추가됨`,
      spinner: false,
      dismissable: true,
    },
    failed: {
      bg: "bg-red-500",
      text: "가져오기 실패",
      spinner: false,
      dismissable: true,
    },
  }[phase.status];

  if (!config) return null;

  return (
    <div
      role="status"
      className={`sticky top-12 left-0 right-0 z-30 ${config.bg} text-white text-center py-2 text-sm font-medium`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-center gap-2 px-4">
        {config.spinner && <Spinner />}
        <span>{config.text}</span>
        {config.dismissable && <DismissButton onClick={dismiss} />}
      </div>
    </div>
  );
}
