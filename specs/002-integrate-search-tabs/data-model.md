# Data Model: Integrate Search & Map Tabs

**Date**: 2026-02-16 | **Branch**: `002-integrate-search-tabs`

## Overview

No new database entities or tables are needed. This feature reuses the existing `restaurants` table and Kakao Local REST API responses. The changes are purely UI-level: composing existing data flows in a new layout.

## Existing Entities (unchanged)

### KakaoPlace (API response)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Kakao place ID |
| place_name | string | Restaurant name |
| address_name | string | Legacy address |
| road_address_name | string | Road-based address |
| category_name | string | Full category path |
| category_group_name | string | Category group |
| x | string | Longitude |
| y | string | Latitude |
| place_url | string | Kakao place page URL |
| distance | string? | Distance from search center |

### Restaurant (Supabase `restaurants` table)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Kakao place ID (PK, unique per user) |
| name | string | Restaurant name |
| address | string | Address |
| category | string | Category |
| lat | number | Latitude |
| lng | number | Longitude |
| placeUrl | string? | Kakao place URL |
| starRating | number | 1-3 star rating |
| createdAt | string | ISO timestamp |

### MapMarker (client-side derived)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Kakao place ID |
| lat | number | Latitude (parsed from KakaoPlace.y) |
| lng | number | Longitude (parsed from KakaoPlace.x) |
| name | string | Restaurant name |
| isWishlisted | boolean | Whether in user's wishlist |

## New Component State (client-side only)

### SearchMapPage state

| State | Type | Description |
|-------|------|-------------|
| query | string | Current search input value |
| results | KakaoPlace[] | Search results from Kakao API |
| isLoading | boolean | Whether a search is in progress |
| hasSearched | boolean | Whether user has performed at least one search |
| selectedPlace | KakaoPlace \| null | Currently selected marker/card |
| sheetState | 'hidden' \| 'peek' \| 'expanded' | Bottom sheet position |

## Data Flow

```
User types query → Press Enter/Button → searchByKeyword(query)
                                              ↓
                                     KakaoPlace[] results
                                      ↓              ↓
                              MapView markers    BottomSheet list
                              (auto-fit bounds)  (RestaurantCards)
                                      ↓              ↓
                              Marker click      Card "Add" button
                                      ↓              ↓
                              Detail card ←──── useAddRestaurant()
                              (wishlist action)      ↓
                                              Supabase insert
```
