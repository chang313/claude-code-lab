/**
 * Contract: Shared UI component props
 *
 * Defines the public interface for all shared components.
 * Components MUST accept these props and render accordingly.
 */

// === RestaurantCard ===

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    address: string;
    category: string;
    starRating: number;
  };
  /** Show "Add to Wishlist" button (search/map) or star rating (wishlist) */
  variant: 'search-result' | 'wishlist';
  /** Whether restaurant is already in wishlist (for search-result variant) */
  isWishlisted?: boolean;
  onAddToWishlist?: () => void;
  onRemove?: () => void;
  onStarChange?: (rating: 1 | 2 | 3) => void;
  onClick?: () => void;
}

// === StarRating ===

interface StarRatingProps {
  value: 1 | 2 | 3;
  onChange?: (rating: 1 | 2 | 3) => void;
  /** Read-only mode (no interaction) */
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// === SearchBar ===

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  /** Debounce delay in ms, default 300 */
  debounceMs?: number;
  isLoading?: boolean;
}

// === MenuItemList ===

interface MenuItemListProps {
  items: Array<{ id: number; name: string }>;
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
}

// === MapView ===

interface MapViewProps {
  /** Center coordinates. Defaults to GPS or fallback city. */
  center?: { lat: number; lng: number };
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    isWishlisted: boolean;
  }>;
  onMarkerClick: (id: string) => void;
  onBoundsChange: (bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => void;
}

// === OfflineBanner ===

interface OfflineBannerProps {
  /** Override auto-detection for testing */
  forceOffline?: boolean;
}
