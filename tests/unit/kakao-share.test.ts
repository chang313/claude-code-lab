import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isKakaoShareAvailable,
  shareService,
  shareProfile,
  SERVICE_URL,
} from "@/lib/kakao-share";

const mockSendDefault = vi.fn();
const mockClipboardWrite = vi.fn();

function setupKakaoMock() {
  vi.stubGlobal("Kakao", {
    Share: { sendDefault: mockSendDefault },
  });
}

function clearKakaoMock() {
  vi.unstubAllGlobals();
}

beforeEach(() => {
  mockSendDefault.mockReset();
  mockClipboardWrite.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockClipboardWrite },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  clearKakaoMock();
});

describe("isKakaoShareAvailable", () => {
  it("returns false when window.Kakao is undefined", () => {
    clearKakaoMock();
    expect(isKakaoShareAvailable()).toBe(false);
  });

  it("returns false when window.Kakao exists but Share is missing", () => {
    vi.stubGlobal("Kakao", {});
    expect(isKakaoShareAvailable()).toBe(false);
  });

  it("returns true when window.Kakao.Share is available", () => {
    setupKakaoMock();
    expect(isKakaoShareAvailable()).toBe(true);
  });
});

describe("shareService", () => {
  it("calls Kakao.Share.sendDefault with correct Korean content when SDK available", async () => {
    setupKakaoMock();
    const result = await shareService();

    expect(result.method).toBe("kakao");
    expect(mockSendDefault).toHaveBeenCalledOnce();

    const arg = mockSendDefault.mock.calls[0][0];
    expect(arg.objectType).toBe("feed");
    expect(arg.content.title).toBe("맛집 리스트");
    expect(typeof arg.content.description).toBe("string");
    expect(arg.content.description.length).toBeGreaterThan(0);
    expect(arg.content.link.webUrl).toBe(SERVICE_URL);
    expect(arg.content.link.mobileWebUrl).toBe(SERVICE_URL);
  });

  it("falls back to clipboard when SDK is unavailable", async () => {
    clearKakaoMock();
    const result = await shareService();

    expect(result.method).toBe("clipboard");
    expect(mockClipboardWrite).toHaveBeenCalledWith(SERVICE_URL);
  });

  it("returns error when clipboard also fails", async () => {
    clearKakaoMock();
    mockClipboardWrite.mockRejectedValue(new Error("clipboard denied"));
    const result = await shareService();

    expect(result.method).toBe("error");
  });
});

describe("shareProfile", () => {
  const userId = "user-abc";
  const displayName = "테스트유저";
  const wishlistCount = 7;

  it("calls Kakao.Share.sendDefault with dynamic Korean title including name and count", async () => {
    setupKakaoMock();
    const result = await shareProfile(userId, displayName, wishlistCount);

    expect(result.method).toBe("kakao");
    expect(mockSendDefault).toHaveBeenCalledOnce();

    const arg = mockSendDefault.mock.calls[0][0];
    expect(arg.content.title).toContain(displayName);
    expect(arg.content.description).toContain(String(wishlistCount));
    expect(arg.content.link.webUrl).toContain(userId);
    expect(arg.content.link.mobileWebUrl).toContain(userId);
  });

  it("falls back to profile URL in clipboard when SDK unavailable", async () => {
    clearKakaoMock();
    const result = await shareProfile(userId, displayName, wishlistCount);

    expect(result.method).toBe("clipboard");
    expect(mockClipboardWrite).toHaveBeenCalledWith(
      expect.stringContaining(userId),
    );
  });

  it("works correctly with zero wishlist count", async () => {
    setupKakaoMock();
    await shareProfile(userId, displayName, 0);

    const arg = mockSendDefault.mock.calls[0][0];
    expect(arg.content.description).toContain("0");
  });
});
