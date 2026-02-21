import type { Bounds, KakaoPlace, KakaoSearchResponse } from "@/types";
import { getExpandedTerms } from "./search-expansions";

const BASE_URL = "https://dapi.kakao.com/v2/local/search";

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_KAKAO_REST_KEY is not set");
  return key;
}

export async function searchByKeyword(params: {
  query: string;
  page?: number;
  size?: number;
  x?: string;
  y?: string;
  radius?: number;
  rect?: string;
  sort?: "accuracy" | "distance";
}): Promise<KakaoSearchResponse> {
  const url = new URL(`${BASE_URL}/keyword`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("category_group_code", "FD6");
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.size) url.searchParams.set("size", String(params.size));
  if (params.x) url.searchParams.set("x", params.x);
  if (params.y) url.searchParams.set("y", params.y);
  if (params.rect) {
    url.searchParams.set("rect", params.rect);
  } else if (params.radius != null) {
    url.searchParams.set("radius", String(params.radius));
  }
  if (params.sort) url.searchParams.set("sort", params.sort);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${getApiKey()}` },
  });

  if (!res.ok) throw new Error(`Kakao API error: ${res.status}`);
  return res.json();
}

const MAX_RESULTS = 300;
const DEFAULT_RADIUS = 5000;

export function boundsEqual(a: Bounds, b: Bounds): boolean {
  const EPS = 1e-6;
  return (
    Math.abs(a.sw.lat - b.sw.lat) < EPS &&
    Math.abs(a.sw.lng - b.sw.lng) < EPS &&
    Math.abs(a.ne.lat - b.ne.lat) < EPS &&
    Math.abs(a.ne.lng - b.ne.lng) < EPS
  );
}

function boundsToRect(bounds: Bounds): string {
  return `${bounds.sw.lng},${bounds.sw.lat},${bounds.ne.lng},${bounds.ne.lat}`;
}

async function paginatedSearch(params: {
  query: string;
  size?: number;
  x?: string;
  y?: string;
  radius?: number;
  rect?: string;
  sort?: "accuracy" | "distance";
}): Promise<KakaoPlace[]> {
  const size = params.size ?? 15;
  const all: KakaoPlace[] = [];

  for (let page = 1; page <= 3; page++) {
    const res = await searchByKeyword({ ...params, page, size });
    all.push(...res.documents);
    if (res.meta.is_end) break;
  }

  return all;
}

function deduplicateAndSort(places: KakaoPlace[]): KakaoPlace[] {
  const seen = new Set<string>();
  const merged: KakaoPlace[] = [];

  for (const doc of places) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    merged.push(doc);
  }

  return merged.slice(0, MAX_RESULTS);
}

export async function smartSearch(params: {
  query: string;
  x?: string;
  y?: string;
  radius?: number;
}): Promise<KakaoPlace[]> {
  const terms = getExpandedTerms(params.query);
  const hasLocation = !!(params.x && params.y);

  const results = await Promise.allSettled(
    terms.map((term) =>
      paginatedSearch({
        query: term,
        ...(hasLocation && {
          x: params.x,
          y: params.y,
          radius: params.radius ?? DEFAULT_RADIUS,
          sort: "accuracy" as const,
        }),
      }),
    ),
  );

  const all: KakaoPlace[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    all.push(...result.value);
  }

  return deduplicateAndSort(all);
}

export async function viewportSearch(params: {
  query: string;
  bounds: Bounds;
  userLocation?: { lat: number; lng: number };
}): Promise<KakaoPlace[]> {
  const terms = getExpandedTerms(params.query);
  const rect = boundsToRect(params.bounds);
  const hasLocation = !!params.userLocation;

  const results = await Promise.allSettled(
    terms.map((term) =>
      paginatedSearch({
        query: term,
        rect,
        ...(hasLocation && {
          x: String(params.userLocation!.lng),
          y: String(params.userLocation!.lat),
          sort: "accuracy" as const,
        }),
      }),
    ),
  );

  const all: KakaoPlace[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    all.push(...result.value);
  }

  return deduplicateAndSort(all);
}
