import { describe, it, expect } from "vitest";
import type { ChatMessage } from "@/types";

describe("ChatMessage type", () => {
  it("accepts user message", () => {
    const msg: ChatMessage = { role: "user", content: "매운 거 추천해줘" };
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("매운 거 추천해줘");
  });

  it("accepts assistant message", () => {
    const msg: ChatMessage = {
      role: "assistant",
      content: "매운집 <<PLACE:12345>> 추천드려요!",
    };
    expect(msg.role).toBe("assistant");
  });
});
