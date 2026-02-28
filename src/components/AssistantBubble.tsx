"use client";

import { parseChatContent } from "@/lib/chat-parser";
import ChatPlaceCard from "@/components/ChatPlaceCard";
import type { Restaurant } from "@/types";

interface AssistantBubbleProps {
  content: string;
  placeMap: Map<string, Restaurant>;
}

export default function AssistantBubble({
  content,
  placeMap,
}: AssistantBubbleProps) {
  const segments = parseChatContent(content);

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return (
                <span key={i} className="text-sm text-gray-800 whitespace-pre-wrap">
                  {seg.content}
                </span>
              );
            }
            const place = placeMap.get(seg.placeId);
            if (!place) return null; // Skip unknown markers
            return <ChatPlaceCard key={i} place={place} />;
          })}
        </div>
      </div>
    </div>
  );
}
