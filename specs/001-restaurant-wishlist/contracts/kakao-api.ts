/**
 * Contract: Kakao Local API client
 *
 * Wraps Kakao Local REST API for restaurant search operations.
 * All external API calls MUST go through this module.
 */

// === Types ===

/** Restaurant data returned from Kakao Local API */
interface KakaoPlace {
  id: string;              // Kakao place ID (unique identifier)
  place_name: string;      // Restaurant name
  address_name: string;    // Full address
  road_address_name: string; // Road-based address
  category_group_name: string; // "음식점" for restaurants
  category_name: string;   // Detailed category (e.g., "음식점 > 일식 > 초밥,롤")
  x: string;               // Longitude (string from API)
  y: string;               // Latitude (string from API)
  place_url: string;       // Kakao Place detail URL
  distance?: string;       // Distance from search center (meters)
}

interface KakaoSearchResponse {
  documents: KakaoPlace[];
  meta: {
    total_count: number;
    pageable_count: number;  // max 45
    is_end: boolean;
    same_name?: {
      region: string[];
      keyword: string;
      selected_region: string;
    };
  };
}

// === API Functions ===

/**
 * Search restaurants by keyword (FR-001).
 * Uses Kakao Local keyword search with category_group_code=FD6 (restaurants).
 *
 * GET https://dapi.kakao.com/v2/local/search/keyword
 * Headers: Authorization: KakaoAK {REST_API_KEY}
 */
type SearchByKeyword = (params: {
  query: string;
  page?: number;     // 1-45, default 1
  size?: number;     // 1-15, default 15
  x?: string;        // center longitude (for distance sorting)
  y?: string;        // center latitude (for distance sorting)
}) => Promise<KakaoSearchResponse>;

/**
 * Search restaurants within map bounds (FR-002, map marker loading).
 * Uses Kakao Local category search with FD6 and map rect bounds.
 *
 * GET https://dapi.kakao.com/v2/local/search/category
 * Headers: Authorization: KakaoAK {REST_API_KEY}
 */
type SearchByBounds = (params: {
  rect: string;      // "x1,y1,x2,y2" (SW lng,lat,NE lng,lat)
  page?: number;
  size?: number;
}) => Promise<KakaoSearchResponse>;
