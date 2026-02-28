import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/use-chat";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockSSEResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: chunks[index] })}\n\n`),
        );
        index++;
      } else {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty messages and not streaming", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
  });

  it("sends message and accumulates streamed response", async () => {
    mockFetch.mockResolvedValue(createMockSSEResponse(["안녕", "하세요"]));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("안녕");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({
      role: "user",
      content: "안녕",
    });
    expect(result.current.messages[1].content).toContain("안녕");
    expect(result.current.messages[1].content).toContain("하세요");
  });

  it("sets error on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.error).toBeTruthy();
  });
});
