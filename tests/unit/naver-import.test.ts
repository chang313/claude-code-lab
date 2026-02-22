import { describe, it, expect } from "vitest";
import { validateShareId, parseNaverBookmarks, buildNaverApiUrl } from "@/lib/naver";
import { makeNaverPlaceId } from "@/types";

// === T006: validateShareId tests ===

describe("validateShareId", () => {
  it("accepts a valid alphanumeric shareId", () => {
    expect(validateShareId("abc123DEF")).toBe("abc123DEF");
  });

  it("returns null for empty string", () => {
    expect(validateShareId("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(validateShareId("   ")).toBeNull();
  });

  it("returns null for special characters", () => {
    expect(validateShareId("abc!@#$")).toBeNull();
  });

  it("returns null for string exceeding 100 chars", () => {
    expect(validateShareId("a".repeat(101))).toBeNull();
  });

  it("extracts shareId from a full Naver URL", () => {
    const url = "https://naver.me/abc123DEF";
    const result = validateShareId(url);
    expect(result).toBe("abc123DEF");
  });

  it("trims whitespace before validation", () => {
    expect(validateShareId("  abc123  ")).toBe("abc123");
  });

  it("accepts exactly 100 character shareId", () => {
    const id = "a".repeat(100);
    expect(validateShareId(id)).toBe(id);
  });
});

// === T006: parseNaverBookmarks tests ===

describe("parseNaverBookmarks", () => {
  it("parses valid bookmarks", () => {
    const response = {
      bookmarkList: [
        { displayname: "맛집A", px: 127.0276, py: 37.4979, address: "서울시 강남구" },
        { displayname: "맛집B", px: 126.978, py: 37.5665, address: "서울시 종로구" },
      ],
    };
    const result = parseNaverBookmarks(response);
    expect(result).toHaveLength(2);
    expect(result[0].displayname).toBe("맛집A");
    expect(result[0].px).toBe(127.0276);
    expect(result[0].py).toBe(37.4979);
  });

  it("skips entries missing displayname", () => {
    const response = {
      bookmarkList: [
        { px: 127.0276, py: 37.4979, address: "서울" },
        { displayname: "맛집", px: 127.0, py: 37.0, address: "서울" },
      ],
    };
    const result = parseNaverBookmarks(response);
    expect(result).toHaveLength(1);
    expect(result[0].displayname).toBe("맛집");
  });

  it("skips entries with missing px", () => {
    const response = {
      bookmarkList: [{ displayname: "맛집", py: 37.0, address: "서울" }],
    };
    expect(parseNaverBookmarks(response)).toHaveLength(0);
  });

  it("skips entries with missing py", () => {
    const response = {
      bookmarkList: [{ displayname: "맛집", px: 127.0, address: "서울" }],
    };
    expect(parseNaverBookmarks(response)).toHaveLength(0);
  });

  it("skips entries with non-numeric px/py", () => {
    const response = {
      bookmarkList: [
        { displayname: "맛집", px: "not-a-number", py: 37.0, address: "서울" },
        { displayname: "맛집B", px: 127.0, py: "NaN", address: "서울" },
      ],
    };
    expect(parseNaverBookmarks(response)).toHaveLength(0);
  });

  it("returns empty array for empty bookmarkList", () => {
    expect(parseNaverBookmarks({ bookmarkList: [] })).toHaveLength(0);
  });

  it("returns empty array for malformed response (no bookmarkList)", () => {
    expect(parseNaverBookmarks({ data: [] })).toHaveLength(0);
  });

  it("returns empty array for null/undefined input", () => {
    expect(parseNaverBookmarks(null)).toHaveLength(0);
    expect(parseNaverBookmarks(undefined)).toHaveLength(0);
  });

  it("handles entries with empty displayname (whitespace only)", () => {
    const response = {
      bookmarkList: [{ displayname: "   ", px: 127.0, py: 37.0, address: "서울" }],
    };
    expect(parseNaverBookmarks(response)).toHaveLength(0);
  });

  it("defaults address to empty string if missing", () => {
    const response = {
      bookmarkList: [{ displayname: "맛집", px: 127.0, py: 37.0 }],
    };
    const result = parseNaverBookmarks(response);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe("");
  });
});

// === T006: buildNaverApiUrl tests ===

describe("buildNaverApiUrl", () => {
  it("constructs correct URL with shareId", () => {
    const url = buildNaverApiUrl("abc123");
    expect(url).toBe(
      "https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/abc123/bookmarks?start=0&limit=5000&sort=lastUseTime",
    );
  });

  it("uses pages.map.naver.com domain", () => {
    const url = buildNaverApiUrl("test");
    expect(url).toContain("pages.map.naver.com");
  });
});

// === T007: makeNaverPlaceId tests ===

describe("makeNaverPlaceId", () => {
  it("generates correct format with naver_ prefix", () => {
    const id = makeNaverPlaceId(37.4979, 127.0276);
    expect(id).toMatch(/^naver_/);
  });

  it("truncates to 6 decimal places", () => {
    const id = makeNaverPlaceId(37.49790123456, 127.02760123456);
    expect(id).toBe("naver_37.497901_127.027601");
  });

  it("preserves exact 6-decimal values", () => {
    const id = makeNaverPlaceId(37.497900, 127.027600);
    expect(id).toBe("naver_37.4979_127.0276");
  });

  it("formats correctly for integer coordinates", () => {
    const id = makeNaverPlaceId(37, 127);
    expect(id).toBe("naver_37_127");
  });
});
