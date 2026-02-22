"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useNaverImport } from "@/db/import-hooks";
import { validateShareId } from "@/lib/naver";
import ImportGuide from "@/components/ImportGuide";
import ImportProgress from "@/components/ImportProgress";
import ImportHistory from "@/components/ImportHistory";
import type { ImportResult } from "@/types";

export default function ImportPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const { importFromNaver, isImporting, progress, error } = useNaverImport();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
    });
  }, [router]);

  const handleImport = async () => {
    if (!validateShareId(linkInput)) return;

    setResult(null);
    const importResult = await importFromNaver(linkInput);
    if (importResult) {
      setResult(importResult);
      setLinkInput("");
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  const isValidLink = validateShareId(linkInput) !== null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <h1 className="text-lg font-bold text-gray-900 mb-4">
        네이버에서 가져오기
      </h1>

      <div className="space-y-4">
        <ImportGuide />

        <div className="space-y-2">
          <input
            type="text"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="네이버 지도 공유 링크를 붙여넣으세요"
            disabled={isImporting}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />

          <button
            onClick={handleImport}
            disabled={!isValidLink || isImporting}
            className="w-full py-3 rounded-xl text-sm font-medium text-white bg-blue-500 disabled:bg-gray-300 disabled:text-gray-500 active:bg-blue-600"
          >
            {isImporting ? "가져오는 중..." : "가져오기"}
          </button>
        </div>

        <ImportProgress
          isImporting={isImporting}
          progress={progress}
          result={result}
          error={error}
          onRetry={handleImport}
        />

        {result && result.importedCount > 0 && (
          <button
            onClick={() => router.push("/my")}
            className="w-full py-3 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 active:bg-blue-100"
          >
            위시 리스트 보기
          </button>
        )}

        <ImportHistory />
      </div>
    </div>
  );
}
