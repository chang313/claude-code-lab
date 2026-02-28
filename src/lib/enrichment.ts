import { searchByKeyword, searchByCategory } from "@/lib/kakao";
import { haversineDistance } from "@/lib/haversine";
import type { KakaoPlace } from "@/types";

const MATCH_RADIUS_M = 300;
const ADDRESS_MATCH_RADIUS_M = 500;
const FALLBACK_RADIUS_M = 50;
const THROTTLE_MS = 100;

/** Strip common Korean business suffixes (역점, 지점, 본점, 직영점, or location+점). */
export function stripSuffix(name: string): string {
  // Try known multi-char suffixes first (most specific)
  const known = /(?:직영점|역점|지점|본점)$/;
  if (known.test(name)) return name.replace(known, "");
  // Generic: 1-4 Korean Hangul characters + 점
  return name.replace(/[\uAC00-\uD7A3]{1,4}점$/, "");
}

/** Normalize a name for comparison: strip whitespace, lowercase, strip Korean suffixes. */
export function normalizeName(name: string): string {
  const base = name.replace(/\s+/g, "").toLowerCase();
  return stripSuffix(base);
}

/** Split a name into tokens: whitespace boundaries + Korean/non-Korean transitions, lowercased, suffixes stripped. */
export function tokenize(name: string): string[] {
  const stripped = stripSuffix(name.trim());
  // Split on whitespace first
  const parts = stripped.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const part of parts) {
    // Split on Korean/non-Korean transitions
    const sub = part.match(/[\uAC00-\uD7A3\u3131-\u318F]+|[^\uAC00-\uD7A3\u3131-\u318F]+/g);
    if (sub) tokens.push(...sub);
    else tokens.push(part);
  }
  return tokens.map((t) => t.toLowerCase()).filter((t) => t.length > 0);
}

/** Ratio of shared tokens between two token sets (relative to the smaller set). */
export function tokenOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const common = a.filter((t) => setB.has(t)).length;
  return common / Math.min(a.length, b.length);
}

const TOKEN_OVERLAP_THRESHOLD = 0.6;

export const MIN_SUBSTRING_RATIO = 0.6;
export const NAME_WEIGHT = 0.8;
export const DIST_WEIGHT = 0.2;
export const MIN_COMPOSITE_SCORE = 0.5;

/** Graduated name similarity score (0–1). Higher = more confident match. */
export function nameMatchScore(naverName: string, kakaoName: string): number {
  const rawA = naverName.replace(/\s+/g, "").toLowerCase();
  const rawB = kakaoName.replace(/\s+/g, "").toLowerCase();
  if (rawA === rawB) return 1.0; // raw exact

  const normA = normalizeName(naverName);
  const normB = normalizeName(kakaoName);
  if (normA === normB) return 0.85; // normalized exact

  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio =
      Math.min(normA.length, normB.length) /
      Math.max(normA.length, normB.length);
    if (ratio >= MIN_SUBSTRING_RATIO) return ratio; // proportional substring
  }

  const overlap = tokenOverlapScore(tokenize(naverName), tokenize(kakaoName));
  return overlap >= TOKEN_OVERLAP_THRESHOLD ? overlap * 0.7 : 0; // token overlap
}

/** Check if two names match (any positive name score). */
export function isNameMatch(naverName: string, kakaoName: string): boolean {
  return nameMatchScore(naverName, kakaoName) > 0;
}

/** Extract the core (brand) name: first token if >= 2 chars; null for single-token names. */
export function extractCoreName(name: string): string | null {
  const tokens = tokenize(name);
  if (tokens.length <= 1) return null;
  return tokens[0].length >= 2 ? tokens[0] : null;
}

/** Normalize a Korean address for comparison: trim, collapse spaces, strip administrative suffixes. */
export function normalizeAddress(address: string | undefined | null): string {
  if (!address) return "";
  return address
    .trim()
    .replace(/\s+/g, " ")
    .replace(/특별자치시|특별자치도|특별시|광역시/g, "");
}

/**
 * Find a Kakao match for a Naver restaurant using road address + coordinates.
 * Address matching is high-confidence (government-standardized), so wider 500m radius is safe.
 * Returns the closest address-matching KakaoPlace, or null.
 */
export async function findKakaoMatchByAddress(
  address: string | undefined | null,
  lat: number,
  lng: number,
): Promise<KakaoPlace | null> {
  const normalizedInput = normalizeAddress(address);
  if (!normalizedInput) return null;

  try {
    const res = await searchByKeyword({
      query: address!,
      x: String(lng),
      y: String(lat),
      radius: ADDRESS_MATCH_RADIUS_M,
      sort: "distance",
      size: 15,
    });

    let best: KakaoPlace | null = null;
    let bestDist = Infinity;

    for (const doc of res.documents) {
      const docLat = parseFloat(doc.y);
      const docLng = parseFloat(doc.x);
      const dist = haversineDistance(lat, lng, docLat, docLng);

      if (dist > ADDRESS_MATCH_RADIUS_M) continue;

      const normalizedRoad = normalizeAddress(doc.road_address_name);
      const normalizedJibun = normalizeAddress(doc.address_name);

      if (normalizedRoad !== normalizedInput && normalizedJibun !== normalizedInput) continue;

      if (dist < bestDist) {
        best = doc;
        bestDist = dist;
      }
    }

    return best;
  } catch {
    return null;
  }
}

/** Find the best name+distance matching place from a list of documents within a given radius. */
function findBestMatch(
  documents: KakaoPlace[],
  naverName: string,
  lat: number,
  lng: number,
  radius: number,
): KakaoPlace | null {
  let best: KakaoPlace | null = null;
  let bestComposite = -1;

  for (const doc of documents) {
    const docLat = parseFloat(doc.y);
    const docLng = parseFloat(doc.x);
    const dist = haversineDistance(lat, lng, docLat, docLng);

    if (dist > radius) continue;

    const nScore = nameMatchScore(naverName, doc.place_name);
    if (nScore === 0) continue;

    const distScore = 1 - dist / radius;
    const composite = nScore * NAME_WEIGHT + distScore * DIST_WEIGHT;

    if (composite > bestComposite) {
      best = doc;
      bestComposite = composite;
    }
  }

  return bestComposite >= MIN_COMPOSITE_SCORE ? best : null;
}

/**
 * Find a Kakao match for a Naver restaurant using name + coordinates.
 * Tier 1: full name search → Tier 1b: core name retry.
 * Returns the best matching KakaoPlace, or null if no confident match.
 */
export async function findKakaoMatch(
  naverName: string,
  lat: number,
  lng: number,
): Promise<KakaoPlace | null> {
  try {
    // Tier 1: search with full name (no category filter)
    const res = await searchByKeyword({
      query: naverName,
      x: String(lng),
      y: String(lat),
      radius: MATCH_RADIUS_M,
      sort: "distance",
      size: 5,
    });

    const match = findBestMatch(res.documents, naverName, lat, lng, MATCH_RADIUS_M);
    if (match) return match;

    // Tier 1b: retry with simplified name
    // Prefer core name (first token) for multi-token names,
    // fall back to suffix-stripped name (e.g. "라치몬트 본점" → "라치몬트")
    const trimmedName = naverName.trim();
    const strippedName = stripSuffix(trimmedName).trim();
    const coreName = extractCoreName(naverName);
    const retryQuery =
      coreName || (strippedName !== trimmedName ? strippedName : null);

    if (retryQuery) {
      const retryRes = await searchByKeyword({
        query: retryQuery,
        x: String(lng),
        y: String(lat),
        radius: MATCH_RADIUS_M,
        sort: "distance",
        size: 10,
      });

      return findBestMatch(retryRes.documents, naverName, lat, lng, MATCH_RADIUS_M);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Coordinate-based fallback: find the nearest food establishment by coordinates.
 * Tries FD6 (음식점) first, then CE7 (카페). Returns full KakaoPlace or null.
 */
export async function findNearestByCoordinates(
  lat: number,
  lng: number,
): Promise<KakaoPlace | null> {
  try {
    const fd6 = await searchByCategory({
      categoryGroupCode: "FD6",
      x: String(lng),
      y: String(lat),
      radius: FALLBACK_RADIUS_M,
      sort: "distance",
      size: 5,
    });

    if (fd6.documents.length > 0) {
      return fd6.documents[0];
    }

    const ce7 = await searchByCategory({
      categoryGroupCode: "CE7",
      x: String(lng),
      y: String(lat),
      radius: FALLBACK_RADIUS_M,
      sort: "distance",
      size: 5,
    });

    if (ce7.documents.length > 0) {
      return ce7.documents[0];
    }

    return null;
  } catch {
    return null;
  }
}

/** Backward-compatible wrapper: returns category_name string or null. */
export async function findCategoryByCoordinates(
  lat: number,
  lng: number,
): Promise<string | null> {
  const nearest = await findNearestByCoordinates(lat, lng);
  return nearest?.category_name ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enrich a batch of restaurants with Kakao data.
 * Updates DB directly for each matched restaurant.
 */
export async function enrichBatch(
  batchId: string | null,
  restaurants: Array<{
    kakao_place_id: string;
    name: string;
    lat: number;
    lng: number;
    category?: string;
    address?: string;
  }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  userId?: string,
): Promise<{ enrichedCount: number; failedCount: number }> {
  let enrichedCount = 0;
  let failedCount = 0;

  for (const restaurant of restaurants) {
    // Skip already-enriched (non-synthetic kakao_place_id)
    if (!restaurant.kakao_place_id.startsWith("naver_")) continue;

    // Skip restaurants that already have a category (idempotent re-enrichment)
    if (restaurant.category) continue;

    try {
      const match = await findKakaoMatch(
        restaurant.name,
        restaurant.lat,
        restaurant.lng,
      );

      if (match) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase
          .from("restaurants")
          .update({
            kakao_place_id: match.id,
            category: match.category_name,
            place_url: match.place_url,
          })
          .eq("kakao_place_id", restaurant.kakao_place_id);

        if (userId) query = query.eq("user_id", userId);
        await query;

        enrichedCount++;
      } else {
        // Tier 1.5: Road address matching (high confidence — updates all fields)
        const addressMatch = await findKakaoMatchByAddress(
          restaurant.address,
          restaurant.lat,
          restaurant.lng,
        );

        if (addressMatch) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let query: any = supabase
            .from("restaurants")
            .update({
              kakao_place_id: addressMatch.id,
              category: addressMatch.category_name,
              place_url: addressMatch.place_url,
            })
            .eq("kakao_place_id", restaurant.kakao_place_id);

          if (userId) query = query.eq("user_id", userId);
          await query;

          enrichedCount++;
        } else {
          // Tier 2: Coordinate-based fallback — promote to full update if name matches
          const nearest = await findNearestByCoordinates(
            restaurant.lat,
            restaurant.lng,
          );

          if (nearest) {
            if (isNameMatch(restaurant.name, nearest.place_name)) {
              // Name matches → full update (high confidence)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let query: any = supabase
                .from("restaurants")
                .update({
                  kakao_place_id: nearest.id,
                  category: nearest.category_name,
                  place_url: nearest.place_url,
                })
                .eq("kakao_place_id", restaurant.kakao_place_id);

              if (userId) query = query.eq("user_id", userId);
              await query;

              enrichedCount++;
            } else {
              // No name match → category-only update (preserve synthetic kakao_place_id)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let query: any = supabase
                .from("restaurants")
                .update({ category: nearest.category_name })
                .eq("kakao_place_id", restaurant.kakao_place_id);

              if (userId) query = query.eq("user_id", userId);
              await query;
            }
          }
        }
      }
    } catch {
      failedCount++;
    }

    await sleep(THROTTLE_MS);
  }

  // Update batch enrichment status (skip for retroactive re-enrichment with no batch)
  if (batchId) {
    // Count how many restaurants in this batch now have a category
    const { count: categorizedCount } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true })
      .eq("import_batch_id", batchId)
      .neq("category", "");

    const status =
      failedCount > 0 && enrichedCount === 0 ? "failed" : "completed";
    await supabase
      .from("import_batches")
      .update({
        enrichment_status: status,
        enriched_count: enrichedCount,
        categorized_count: categorizedCount ?? 0,
      })
      .eq("id", batchId);
  }

  return { enrichedCount, failedCount };
}
