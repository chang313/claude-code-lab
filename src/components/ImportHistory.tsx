"use client";

import { useEffect, useState } from "react";
import {
  useImportHistory,
  useUndoImport,
  useRetriggerEnrichment,
} from "@/db/import-hooks";

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: "대기", color: "bg-gray-100 text-gray-600" },
  running: { text: "진행 중", color: "bg-blue-100 text-blue-600" },
  completed: { text: "완료", color: "bg-green-100 text-green-600" },
  failed: { text: "실패", color: "bg-red-100 text-red-600" },
};

export default function ImportHistory() {
  const { batches, isLoading, fetchHistory } = useImportHistory();
  const { undoImport } = useUndoImport();
  const { retriggerEnrichment } = useRetriggerEnrichment();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (batches.length === 0) return null;

  const handleUndo = async (batchId: string) => {
    const result = await undoImport(batchId);
    if (result) {
      fetchHistory();
    }
    setConfirmId(null);
  };

  const handleRetrigger = async (batchId: string) => {
    await retriggerEnrichment(batchId);
    fetchHistory();
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-gray-700">가져오기 기록</h2>
      {batches.map((batch) => {
        const status = STATUS_LABELS[batch.enrichmentStatus] ?? STATUS_LABELS.pending;
        const date = new Date(batch.createdAt).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={batch.id}
            className="rounded-xl border border-gray-200 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {batch.sourceName}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}
                >
                  {status.text}
                </span>
              </div>
              <span className="text-xs text-gray-400">{date}</span>
            </div>

            <div className="text-xs text-gray-500">
              가져온 {batch.importedCount}개
              {batch.skippedCount > 0 && ` · 중복 ${batch.skippedCount}개`}
              {batch.enrichedCount > 0 &&
                ` · 카테고리 ${batch.enrichedCount}개`}
            </div>

            <div className="flex gap-2">
              {(batch.enrichmentStatus === "failed" ||
                batch.enrichmentStatus === "pending") && (
                <button
                  onClick={() => handleRetrigger(batch.id)}
                  className="text-xs text-blue-500 font-medium"
                >
                  카테고리 다시 가져오기
                </button>
              )}

              {confirmId === batch.id ? (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-red-600">
                    정말 되돌리시겠습니까?
                  </span>
                  <button
                    onClick={() => handleUndo(batch.id)}
                    className="text-xs text-red-600 font-bold"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-gray-500"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(batch.id)}
                  className="text-xs text-red-500 font-medium"
                >
                  되돌리기
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
