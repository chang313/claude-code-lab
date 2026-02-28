"use client";

import type { ImportResult } from "@/types";

interface ImportProgressProps {
  isImporting: boolean;
  progress: { current: number; total: number } | null;
  result: ImportResult | null;
  error: string | null;
  onRetry?: () => void;
}

export default function ImportProgress({
  isImporting,
  progress,
  result,
  error,
  onRetry,
}: ImportProgressProps) {
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm font-medium text-red-600 underline"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  if (isImporting && progress) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500 animate-spin"
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
          <p className="text-sm text-blue-700">
            {progress.total}개 장소 가져오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (isImporting) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500 animate-spin"
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
          <p className="text-sm text-blue-700">네이버 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
        <p className="text-sm font-medium text-green-800">가져오기 완료!</p>
        <div className="text-sm text-green-700 space-y-1">
          <p>추가됨: {result.importedCount}개</p>
          {result.skippedCount > 0 && (
            <p>중복 건너뜀: {result.skippedCount}개</p>
          )}
          {result.closedCount > 0 && (
            <p>폐업 건너뜀: {result.closedCount}개</p>
          )}
          {result.invalidCount > 0 && (
            <p>유효하지 않은 항목: {result.invalidCount}개</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
