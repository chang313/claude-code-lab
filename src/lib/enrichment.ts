import { searchByKeyword } from "@/lib/kakao";
import { haversineDistance } from "@/lib/haversine";
import type { KakaoPlace } from "@/types";

const MATCH_RADIUS_M = 100;
const THROTTLE_MS = 100;

/** Normalize a name for comparison: strip whitespace, lowercase. */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** Check if two names are a substring match (either contains the other). */
function isNameMatch(naverName: string, kakaoName: string): boolean {
  const a = normalizeName(naverName);
  const b = normalizeName(kakaoName);
  return a.includes(b) || b.includes(a);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enrich a batch of restaurants with Kakao data.
 * Updates DB directly for each matched restaurant.
 */
export async function enrichBatch(
  batchId: string,
  restaurants: Array<{
    kakao_place_id: string;
    name: string;
    lat: number;
    lng: number;
  }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
): Promise<{ enrichedCount: number; failedCount: number }> {
  let enrichedCount = 0;
  let failedCount = 0;

  for (const restaurant of restaurants) {
    // Skip already-enriched (non-synthetic kakao_place_id)
    if (!restaurant.kakao_place_id.startsWith("naver_")) continue;

    try {
      const match = await findKakaoMatch(
        restaurant.name,
        restaurant.lat,
        restaurant.lng,
      );

      if (match) {
        await supabase
          .from("restaurants")
          .update({
            kakao_place_id: match.id,
            category: match.category_name,
            place_url: match.place_url,
          })
          .eq("kakao_place_id", restaurant.kakao_place_id);

        enrichedCount++;
      }
    } catch {
      failedCount++;
    }

    await sleep(THROTTLE_MS);
  }

  // Update batch enrichment status
  const status = failedCount > 0 && enrichedCount === 0 ? "failed" : "completed";
  await supabase
    .from("import_batches")
    .update({
      enrichment_status: status,
      enriched_count: enrichedCount,
    })
    .eq("id", batchId);

  return { enrichedCount, failedCount };
}
