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

export interface SubcategoryGroup {
  subcategory: string;
  restaurants: Restaurant[];
  count: number;
}
