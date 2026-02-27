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

/** Check if two names are a substring match (either contains the other). */
function isNameMatch(naverName: string, kakaoName: string): boolean {
  const a = normalizeName(naverName);
  const b = normalizeName(kakaoName);
  return a.includes(b) || b.includes(a);
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

/**
 * Find a Kakao match for a Naver restaurant using name + coordinates.
 * Returns the best matching KakaoPlace, or null if no confident match.
 */
export async function findKakaoMatch(
  naverName: string,
  lat: number,
  lng: number,
): Promise<KakaoPlace | null> {
  try {
    const res = await searchByKeyword({
      query: naverName,
      x: String(lng),
      y: String(lat),
      radius: MATCH_RADIUS_M,
      sort: "distance",
      size: 5,
    });

    let best: KakaoPlace | null = null;
    let bestDist = Infinity;

    for (const doc of res.documents) {
      const docLat = parseFloat(doc.y);
      const docLng = parseFloat(doc.x);
      const dist = haversineDistance(lat, lng, docLat, docLng);

      if (dist > MATCH_RADIUS_M) continue;
      if (!isNameMatch(naverName, doc.place_name)) continue;

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

/**
 * Coordinate-based category fallback: find the nearest food establishment
 * by coordinates and return its category. Tries FD6 (음식점) first, then CE7 (카페).
 * Returns category_name string or null.
 */
export async function findCategoryByCoordinates(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    // Try FD6 (음식점) first
    const fd6 = await searchByCategory({
      categoryGroupCode: "FD6",
      x: String(lng),
      y: String(lat),
      radius: FALLBACK_RADIUS_M,
      sort: "distance",
      size: 5,
    });

    if (fd6.documents.length > 0) {
      return fd6.documents[0].category_name;
    }

    // Fallback to CE7 (카페)
    const ce7 = await searchByCategory({
      categoryGroupCode: "CE7",
      x: String(lng),
      y: String(lat),
      radius: FALLBACK_RADIUS_M,
      sort: "distance",
      size: 5,
    });

    if (ce7.documents.length > 0) {
      return ce7.documents[0].category_name;
    }

    return null;
  } catch {
    return null;
  }
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
          // Tier 2: Coordinate-based fallback — update category only (preserve kakao_place_id and place_url)
          const fallbackCategory = await findCategoryByCoordinates(
            restaurant.lat,
            restaurant.lng,
          );

          if (fallbackCategory) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query: any = supabase
              .from("restaurants")
              .update({ category: fallbackCategory })
              .eq("kakao_place_id", restaurant.kakao_place_id);

            if (userId) query = query.eq("user_id", userId);
            await query;
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
