export interface Restaurant {
  id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  placeUrl?: string;
  starRating: number;
  createdAt: string;
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
