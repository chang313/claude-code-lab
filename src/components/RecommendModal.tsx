"use client";

import { useState } from "react";
import {
  useMutualFollowers,
  useSendRecommendation,
} from "@/db/recommendation-hooks";
import type { Restaurant, UserProfile } from "@/types";

interface RecommendModalProps {
  restaurant: Restaurant;
  onClose: () => void;
}

export default function RecommendModal({
  restaurant,
  onClose,
}: RecommendModalProps) {
  const { mutualFollowers, isLoading } = useMutualFollowers();
  const { sendRecommendation } = useSendRecommendation();
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (follower: UserProfile) => {
    setSending(follower.id);
    setError(null);
    try {
      const success = await sendRecommendation(follower.id, restaurant);
      if (success) {
        setSentTo((prev) => new Set(prev).add(follower.id));
      } else {
        setError("이미 추천한 맛집입니다");
      }
    } catch {
      setError("추천 전송에 실패했습니다");
    } finally {
      setSending(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl p-4 pb-8 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">맛집 추천하기</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          <span className="font-medium text-gray-700">{restaurant.name}</span>
          을(를) 누구에게 추천할까요?
        </p>

        {error && (
          <p className="text-sm text-red-500 mb-2">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">로딩 중...</div>
          ) : mutualFollowers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>서로 팔로우한 친구가 없습니다</p>
              <p className="text-xs mt-1">
                맛집을 추천하려면 서로 팔로우해야 합니다
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {mutualFollowers.map((follower) => {
                const alreadySent = sentTo.has(follower.id);
                const isSending = sending === follower.id;
                return (
                  <li
                    key={follower.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {follower.avatarUrl ? (
                        <img
                          src={follower.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm">
                          {follower.displayName[0]}
                        </div>
                      )}
                      <span className="font-medium text-sm">
                        {follower.displayName}
                      </span>
                    </div>
                    {alreadySent ? (
                      <span className="text-sm text-green-600 font-medium">
                        ✓ 전송됨
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSend(follower)}
                        disabled={isSending}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSending ? "전송 중..." : "추천"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
