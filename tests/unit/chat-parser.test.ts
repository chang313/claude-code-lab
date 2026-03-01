import { describe, it, expect } from "vitest";
import { parseChatContent } from "@/lib/chat-parser";

describe("parseChatContent", () => {
  it("returns plain text when no markers", () => {
    const result = parseChatContent("오늘 뭐 먹을까요?");
    expect(result).toEqual([{ type: "text", content: "오늘 뭐 먹을까요?" }]);
  });

  it("parses a single place marker", () => {
    const result = parseChatContent("맛있는 치킨 <<PLACE:kakao-1>> 추천드려요!");
    expect(result).toEqual([
      { type: "text", content: "맛있는 치킨 " },
      { type: "place", placeId: "kakao-1" },
      { type: "text", content: " 추천드려요!" },
    ]);
  });

  it("parses multiple place markers", () => {
    const result = parseChatContent(
      "<<PLACE:id1>> 과 <<PLACE:id2>> 를 추천합니다",
    );
    expect(result).toEqual([
      { type: "place", placeId: "id1" },
      { type: "text", content: " 과 " },
      { type: "place", placeId: "id2" },
      { type: "text", content: " 를 추천합니다" },
    ]);
  });

  it("handles empty string", () => {
    const result = parseChatContent("");
    expect(result).toEqual([]);
  });

  it("handles marker at start and end", () => {
    const result = parseChatContent("<<PLACE:abc>>");
    expect(result).toEqual([{ type: "place", placeId: "abc" }]);
  });

  it("skips empty text segments between adjacent markers", () => {
    const result = parseChatContent("<<PLACE:a>><<PLACE:b>>");
    expect(result).toEqual([
      { type: "place", placeId: "a" },
      { type: "place", placeId: "b" },
    ]);
  });

  it("parses name:id format from LLM output", () => {
    const result = parseChatContent("맛있는 치킨 <<르프리크 성수:936069123>> 추천드려요!");
    expect(result).toEqual([
      { type: "text", content: "맛있는 치킨 " },
      { type: "place", placeId: "936069123" },
      { type: "text", content: " 추천드려요!" },
    ]);
  });

  it("parses mixed name:id markers", () => {
    const result = parseChatContent(
      "<<교촌치킨 강남점:111>> 과 <<르프리크 성수:222>> 를 추천합니다",
    );
    expect(result).toEqual([
      { type: "place", placeId: "111" },
      { type: "text", content: " 과 " },
      { type: "place", placeId: "222" },
      { type: "text", content: " 를 추천합니다" },
    ]);
  });

  it("parses markers with Naver-imported place IDs containing dots", () => {
    const result = parseChatContent(
      "이 집 추천해요! <<맛집이름:naver_37.505903_127.047289>> 정말 맛있어요",
    );
    expect(result).toEqual([
      { type: "text", content: "이 집 추천해요! " },
      { type: "place", placeId: "naver_37.505903_127.047289" },
      { type: "text", content: " 정말 맛있어요" },
    ]);
  });
});
