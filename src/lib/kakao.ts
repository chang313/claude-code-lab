import type { KakaoPlace, KakaoSearchResponse } from "@/types";
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
  sort?: "accuracy" | "distance";
}): Promise<KakaoSearchResponse> {
  const url = new URL(`${BASE_URL}/keyword`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("category_group_code", "FD6");
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.size) url.searchParams.set("size", String(params.size));
  if (params.x) url.searchParams.set("x", params.x);
  if (params.y) url.searchParams.set("y", params.y);
  if (params.radius != null) url.searchParams.set("radius", String(params.radius));
  if (params.sort) url.searchParams.set("sort", params.sort);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${getApiKey()}` },
  });

  if (!res.ok) throw new Error(`Kakao API error: ${res.status}`);
  return res.json();
}

const MAX_RESULTS = 45;
const DEFAULT_RADIUS = 5000;

export async function smartSearch(params: {
  query: string;
  x?: string;
  y?: string;
  radius?: number;
}): Promise<KakaoPlace[]> {
  const terms = getExpandedTerms(params.query);
  const hasLocation = params.x && params.y;

  const results = await Promise.allSettled(
    terms.map((term) =>
      searchByKeyword({
        query: term,
        size: 15,
        ...(hasLocation && {
          x: params.x,
          y: params.y,
          radius: params.radius ?? DEFAULT_RADIUS,
          sort: "distance" as const,
        }),
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: KakaoPlace[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const doc of result.value.documents) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      merged.push(doc);
    }
  }

  if (hasLocation) {
    merged.sort((a, b) => {
      const da = parseInt(a.distance ?? "0", 10);
      const db = parseInt(b.distance ?? "0", 10);
      return da - db;
    });
  }

  return merged.slice(0, MAX_RESULTS);
}

export async function searchByBounds(params: {
  rect: string;
  page?: number;
  size?: number;
}): Promise<KakaoSearchResponse> {
  const url = new URL(`${BASE_URL}/category`);
  url.searchParams.set("category_group_code", "FD6");
  url.searchParams.set("rect", params.rect);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.size) url.searchParams.set("size", String(params.size));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${getApiKey()}` },
  });

  if (!res.ok) throw new Error(`Kakao API error: ${res.status}`);
  return res.json();
}
