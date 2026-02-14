import type { KakaoSearchResponse } from "@/types";

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
}): Promise<KakaoSearchResponse> {
  const url = new URL(`${BASE_URL}/keyword`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("category_group_code", "FD6");
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.size) url.searchParams.set("size", String(params.size));
  if (params.x) url.searchParams.set("x", params.x);
  if (params.y) url.searchParams.set("y", params.y);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${getApiKey()}` },
  });

  if (!res.ok) throw new Error(`Kakao API error: ${res.status}`);
  return res.json();
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
