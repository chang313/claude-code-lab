import type { NaverBookmark } from "@/types";

const SHARE_ID_PATTERN = /^[a-zA-Z0-9]{1,100}$/;
const NAVER_URL_PATTERN =
  /(?:naver\.me\/[a-zA-Z0-9]+|map\.naver\.com\/.*?[?&/]([a-zA-Z0-9]+))/;

/**
 * Extract and validate a Naver share ID from raw input (alphanumeric ID or full URL).
 * Returns the alphanumeric shareId if valid, null otherwise.
 */
export function validateShareId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct alphanumeric shareId
  if (SHARE_ID_PATTERN.test(trimmed)) return trimmed;

  // Try extracting from URL — look for the last path segment or query param
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && SHARE_ID_PATTERN.test(lastPart)) return lastPart;
  } catch {
    // Not a valid URL — fall through
  }

  // Try regex extraction
  const match = trimmed.match(NAVER_URL_PATTERN);
  if (match) {
    const candidate = match[1] || match[0].split("/").pop();
    if (candidate && SHARE_ID_PATTERN.test(candidate)) return candidate;
  }

  return null;
}

/**
 * Parse Naver bookmark response. Validates each entry, skips those missing
 * displayname/px/py or with non-numeric coords.
 * Returns only valid bookmarks.
 */
export function parseNaverBookmarks(response: unknown): NaverBookmark[] {
  if (!response || typeof response !== "object") return [];
  const resp = response as Record<string, unknown>;
  if (!Array.isArray(resp.bookmarkList)) return [];

  const valid: NaverBookmark[] = [];

  for (const entry of resp.bookmarkList) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;

    const displayname = e.displayname;
    if (typeof displayname !== "string" || !displayname.trim()) continue;

    const px = Number(e.px);
    const py = Number(e.py);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;

    valid.push({
      displayname: displayname.trim(),
      name: typeof e.name === "string" ? e.name : undefined,
      px,
      py,
      address: typeof e.address === "string" ? (e.address as string) : "",
    });
  }

  return valid;
}

/** Construct the Naver bookmark API URL for a given shareId. */
export function buildNaverApiUrl(shareId: string): string {
  return `https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/${shareId}/bookmarks?start=0&limit=5000&sort=lastUseTime`;
}
