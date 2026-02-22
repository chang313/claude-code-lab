import type { NaverBookmark } from "@/types";

const SHARE_ID_PATTERN = /^[a-zA-Z0-9]{1,100}$/;
const FOLDER_PATH_PATTERN = /\/folder\/([a-f0-9]{32})/;

/**
 * Extract and validate a Naver share ID from raw input.
 * Accepts: direct hex share ID, naver.me short URL, or full map.naver.com URL.
 * For naver.me short URLs, returns the short code (must be resolved server-side).
 */
export function validateShareId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct alphanumeric shareId (hex folder ID or short code)
  if (SHARE_ID_PATTERN.test(trimmed)) return trimmed;

  // Try extracting from URL
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );

    // Full map.naver.com URL with folder ID
    const folderMatch = url.pathname.match(FOLDER_PATH_PATTERN);
    if (folderMatch) return folderMatch[1];

    // naver.me short URL — return the short code for server-side resolution
    if (url.hostname === "naver.me") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const code = pathParts[pathParts.length - 1];
      if (code && SHARE_ID_PATTERN.test(code)) return code;
    }

    // Generic fallback: last path segment
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && SHARE_ID_PATTERN.test(lastPart)) return lastPart;
  } catch {
    // Not a valid URL — fall through
  }

  return null;
}

/** Check if the input is a naver.me short URL that needs server-side resolution. */
export function isNaverShortUrl(input: string): boolean {
  try {
    const url = new URL(
      input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`,
    );
    return url.hostname === "naver.me";
  } catch {
    return false;
  }
}

/**
 * Resolve a naver.me short URL to the actual share ID by following the redirect.
 * Returns the 32-char hex folder ID, or null if resolution fails.
 */
export async function resolveNaverShortUrl(shortCode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://naver.me/${shortCode}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const location = res.headers.get("location");
    if (!location) return null;

    const match = location.match(FOLDER_PATH_PATTERN);
    return match ? match[1] : null;
  } catch {
    return null;
  }
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
