"use client";

import { useRef, useEffect, useMemo } from "react";
import { useWishlist } from "@/db/hooks";
import { useChat } from "@/hooks/use-chat";
import ChatInput from "@/components/ChatInput";
import AssistantBubble from "@/components/AssistantBubble";
import Toast from "@/components/Toast";
import type { Restaurant } from "@/types";

const SUGGESTED_PROMPTS = [
  "오늘 뭐 먹지?",
  "매운 거 추천해줘",
  "카페 가고 싶어",
  "별점 높은 곳 알려줘",
];

const MIN_PLACES = 3;

export default function DiscoverPage() {
  const { restaurants, isLoading: placesLoading } = useWishlist();
  const { messages, isStreaming, error, sendMessage, clearMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a place lookup map
  const placeMap = useMemo(() => {
    const map = new Map<string, Restaurant>();
    for (const r of restaurants) {
      map.set(r.id, r);
    }
    return map;
  }, [restaurants]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  if (placesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  if (restaurants.length < MIN_PLACES) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
        <p className="text-lg text-gray-600">
          맛집을 3개 이상 저장하면 AI 추천을 받을 수 있어요!
        </p>
        <p className="text-sm text-gray-400 mt-2">
          검색에서 맛집을 저장해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-bold">AI 맛집 추천</h1>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            새 대화
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                저장한 {restaurants.length}개의 맛집 중에서 추천해드릴게요
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isStreaming}
                  className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end mb-3">
                  <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <AssistantBubble key={i} content={msg.content} placeMap={placeMap} />
              ),
            )}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — pinned to bottom of flex container */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />

      {error && (
        <Toast
          message={error}
          type="error"
          onDismiss={() => {}}
        />
      )}
    </div>
  );
}
