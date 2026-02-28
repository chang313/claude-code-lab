export interface Restaurant {
  id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  placeUrl?: string;
  starRating: number | null;
  createdAt: string;
}

export function isVisited(restaurant: Restaurant): boolean {
  return restaurant.starRating !== null;
}

export interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_group_name: string;
  category_name: string;
  x: string;
  y: string;
  place_url: string;
  distance?: string;
}

export interface KakaoSearchResponse {
  documents: KakaoPlace[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
    same_name?: {
      region: string[];
      keyword: string;
      selected_region: string;
    };
  };
}

// === Map Marker types ===

export type MarkerType = "search" | "wishlist" | "visited";

export interface SavedMarkerData {
  kakaoPlaceId: string;
  name: string;
  lat: number;
  lng: number;
  starRating: number | null;
  category: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  sw: LatLng;
  ne: LatLng;
}

export interface SubcategoryGroup {
  subcategory: string;
  restaurants: Restaurant[];
  count: number;
}

// === Social / Profile types ===

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserProfileWithCounts extends UserProfile {
  followerCount: number;
  followingCount: number;
}

export interface FollowRelationship {
  followerId: string;
  followedId: string;
  createdAt: string;
}

export interface DbProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFollow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export function mapDbProfile(row: DbProfile): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

// === Recommendation types ===

export interface Recommendation {
  id: string;
  senderId: string;
  recipientId: string;
  kakaoPlaceId: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  restaurantPlaceUrl: string | null;
  status: "pending" | "accepted" | "ignored";
  isRead: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface RecommendationWithSender extends Recommendation {
  sender: UserProfile;
}

export interface DbRecommendation {
  id: string;
  sender_id: string;
  recipient_id: string;
  kakao_place_id: string;
  restaurant_name: string;
  restaurant_category: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
  restaurant_place_url: string | null;
  status: string;
  is_read: boolean;
  created_at: string;
  resolved_at: string | null;
}

export function mapDbRecommendation(row: DbRecommendation): Recommendation {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    kakaoPlaceId: row.kakao_place_id,
    restaurantName: row.restaurant_name,
    restaurantCategory: row.restaurant_category,
    restaurantAddress: row.restaurant_address,
    restaurantLat: row.restaurant_lat,
    restaurantLng: row.restaurant_lng,
    restaurantPlaceUrl: row.restaurant_place_url,
    status: row.status as Recommendation["status"],
    isRead: row.is_read,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

// === Naver Import types ===

export interface NaverBookmark {
  displayname: string;
  name?: string;
  px: number;
  py: number;
  address: string;
  closed?: boolean;
}

export interface NaverBookmarkResponse {
  bookmarkList: NaverBookmark[];
}

export interface ImportBatch {
  id: string;
  sourceName: string;
  shareId: string;
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  enrichmentStatus: "pending" | "running" | "completed" | "failed";
  enrichedCount: number;
  createdAt: string;
}

export interface ImportResult {
  batchId: string;
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  closedCount: number;
  totalCount: number;
}

/** Generate a synthetic kakao_place_id for Naver-imported restaurants. */
export function makeNaverPlaceId(py: number, px: number): string {
  const lat = Number(py.toFixed(6));
  const lng = Number(px.toFixed(6));
  return `naver_${lat}_${lng}`;
}

// === Discover (AI Recommendations) ===

export interface DiscoverItem {
  kakaoPlaceId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  placeUrl: string | null;
  reason: string;
  source: "social" | "discovery";
  savedByCount: number;
  savedByNames: string[];
}

export interface DiscoverResponse {
  recommendations: DiscoverItem[];
  fallback: boolean;
}

export interface GroqRecommendation {
  kakao_place_id: string;
  reason: string;
}

export interface GroqResponse {
  recommendations: GroqRecommendation[];
}

export interface SocialCandidate {
  kakaoPlaceId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  placeUrl: string | null;
  savedByCount: number;
  savedByNames: string[];
}

export interface DbSocialCandidate {
  kakao_place_id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  place_url: string | null;
  saved_by_count: number;
  saved_by_names: string[];
}

export function mapDbSocialCandidate(row: DbSocialCandidate): SocialCandidate {
  return {
    kakaoPlaceId: row.kakao_place_id,
    name: row.name,
    category: row.category,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    placeUrl: row.place_url,
    savedByCount: row.saved_by_count,
    savedByNames: row.saved_by_names,
  };
}
