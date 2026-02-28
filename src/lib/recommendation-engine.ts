import { createClient } from "@/lib/supabase/server";
import { searchByKeyword } from "@/lib/kakao";
import { rankWithGroq } from "@/lib/groq";
import type {
  SocialCandidate,
  DbSocialCandidate,
  DiscoverItem,
  DiscoverResponse,
} from "@/types";
import { mapDbSocialCandidate } from "@/types";
import type { DiscoveryCandidate, UserProfile } from "@/lib/groq";

const MAX_CANDIDATES = 50;
const MAX_RECOMMENDATIONS = 10;
const DISCOVERY_RADIUS = 5000;
const MIN_SAVED_FOR_RECOMMENDATIONS = 3;

// === Social Candidates (from mutual followers' wishlists) ===

export async function getSocialCandidates(
  userId: string,
): Promise<SocialCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_social_candidates", {
    target_user_id: userId,
  });
  if (error || !data) return [];
  return (data as DbSocialCandidate[]).map(mapDbSocialCandidate);
}

// === User Profile Analysis ===

interface AnalyzedProfile extends UserProfile {
  centerLat: number;
  centerLng: number;
}

export function analyzeUserProfile(
  restaurants: { category: string; lat: number; lng: number }[],
): AnalyzedProfile {
  if (restaurants.length === 0) {
    return {
      totalSaved: 0,
      topCategories: [],
      topArea: "",
      centerLat: 0,
      centerLng: 0,
    };
  }

  // Count categories (extract subcategory after " > ")
  const categoryCounts = new Map<string, number>();
  for (const r of restaurants) {
    const sub = r.category.includes(" > ")
      ? r.category.split(" > ").pop()!
      : r.category;
    categoryCounts.set(sub, (categoryCounts.get(sub) ?? 0) + 1);
  }

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Geographic center
  const centerLat =
    restaurants.reduce((sum, r) => sum + r.lat, 0) / restaurants.length;
  const centerLng =
    restaurants.reduce((sum, r) => sum + r.lng, 0) / restaurants.length;

  return {
    totalSaved: restaurants.length,
    topCategories,
    topArea: topCategories[0] ?? "",
    centerLat,
    centerLng,
  };
}

// === Discovery Candidates (Kakao API) ===

export async function getDiscoveryCandidates(
  topCategories: string[],
  centerLat: number,
  centerLng: number,
  existingPlaceIds: Set<string>,
): Promise<DiscoveryCandidate[]> {
  if (topCategories.length === 0 || centerLat === 0) return [];

  const candidates: DiscoveryCandidate[] = [];

  for (const category of topCategories.slice(0, 3)) {
    try {
      const response = await searchByKeyword({
        query: category,
        x: String(centerLng),
        y: String(centerLat),
        radius: DISCOVERY_RADIUS,
        size: 10,
        sort: "accuracy",
      });

      for (const doc of response.documents) {
        if (existingPlaceIds.has(doc.id)) continue;
        candidates.push({
          kakaoPlaceId: doc.id,
          name: doc.place_name,
          category: doc.category_name,
          address: doc.address_name,
        });
        existingPlaceIds.add(doc.id);
      }
    } catch {
      // Skip failed category searches
    }
  }

  return candidates;
}

// === Merge Candidates ===

interface MergedCandidate {
  kakaoPlaceId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  placeUrl: string | null;
  source: "social" | "discovery";
  savedByCount: number;
  savedByNames: string[];
}

export function mergeCandidates(
  social: SocialCandidate[],
  discovery: DiscoveryCandidate[],
): MergedCandidate[] {
  const seen = new Set<string>();
  const merged: MergedCandidate[] = [];

  // Social candidates first (higher priority)
  for (const c of social) {
    if (seen.has(c.kakaoPlaceId)) continue;
    seen.add(c.kakaoPlaceId);
    merged.push({
      ...c,
      source: "social",
    });
  }

  // Discovery candidates
  for (const c of discovery) {
    if (seen.has(c.kakaoPlaceId)) continue;
    seen.add(c.kakaoPlaceId);
    merged.push({
      kakaoPlaceId: c.kakaoPlaceId,
      name: c.name,
      category: c.category,
      address: c.address,
      lat: 0,
      lng: 0,
      placeUrl: null,
      source: "discovery",
      savedByCount: 0,
      savedByNames: [],
    });
  }

  return merged.slice(0, MAX_CANDIDATES);
}

// === Fallback Ranking (no LLM) ===

function fallbackRank(candidates: MergedCandidate[]): DiscoverItem[] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.source !== b.source) return a.source === "social" ? -1 : 1;
    return b.savedByCount - a.savedByCount;
  });

  return sorted.slice(0, MAX_RECOMMENDATIONS).map((c) => ({
    kakaoPlaceId: c.kakaoPlaceId,
    name: c.name,
    category: c.category,
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    placeUrl: c.placeUrl,
    source: c.source,
    savedByCount: c.savedByCount,
    savedByNames: c.savedByNames,
    reason:
      c.source === "social"
        ? `친구 ${c.savedByCount}명이 저장했어요`
        : `자주 가는 ${c.category.includes(" > ") ? c.category.split(" > ").pop() : c.category} 근처 맛집`,
  }));
}

// === Main Entry Point ===

export async function generateRecommendations(
  userId: string,
): Promise<DiscoverResponse> {
  const supabase = await createClient();

  // 1. Get user's saved restaurants for profile analysis
  const { data: userRestaurants } = await supabase
    .from("restaurants")
    .select("category, lat, lng")
    .eq("user_id", userId);

  const restaurants = (userRestaurants ?? []) as {
    category: string;
    lat: number;
    lng: number;
  }[];

  if (restaurants.length < MIN_SAVED_FOR_RECOMMENDATIONS) {
    return { recommendations: [], fallback: false };
  }

  // 2. Analyze profile
  const profile = analyzeUserProfile(restaurants);

  // 3. Gather candidates
  const socialCandidates = await getSocialCandidates(userId);

  const userPlaceIds = new Set<string>();
  const { data: userPlaces } = await supabase
    .from("restaurants")
    .select("kakao_place_id")
    .eq("user_id", userId);
  for (const p of userPlaces ?? []) {
    userPlaceIds.add((p as { kakao_place_id: string }).kakao_place_id);
  }
  for (const c of socialCandidates) {
    userPlaceIds.add(c.kakaoPlaceId);
  }

  const discoveryCandidates = await getDiscoveryCandidates(
    profile.topCategories,
    profile.centerLat,
    profile.centerLng,
    userPlaceIds,
  );

  // 4. Merge
  const merged = mergeCandidates(socialCandidates, discoveryCandidates);

  if (merged.length === 0) {
    return { recommendations: [], fallback: false };
  }

  // 5. LLM ranking
  const groqResult = await rankWithGroq(
    socialCandidates,
    discoveryCandidates,
    profile,
  );

  if (groqResult) {
    const candidateMap = new Map(merged.map((c) => [c.kakaoPlaceId, c]));
    const recommendations: DiscoverItem[] = [];

    for (const rec of groqResult.recommendations.slice(0, MAX_RECOMMENDATIONS)) {
      const candidate = candidateMap.get(rec.kakao_place_id);
      if (!candidate) continue;
      recommendations.push({
        kakaoPlaceId: candidate.kakaoPlaceId,
        name: candidate.name,
        category: candidate.category,
        address: candidate.address,
        lat: candidate.lat,
        lng: candidate.lng,
        placeUrl: candidate.placeUrl,
        source: candidate.source,
        savedByCount: candidate.savedByCount,
        savedByNames: candidate.savedByNames,
        reason: rec.reason,
      });
    }

    return { recommendations, fallback: false };
  }

  // 6. Fallback
  return { recommendations: fallbackRank(merged), fallback: true };
}
