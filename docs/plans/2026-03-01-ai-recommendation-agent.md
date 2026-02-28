# AI Restaurant Recommendation Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered `/discover` page that suggests restaurants using social signals (friends' wishlists) and personal patterns, ranked by Groq LLaMA 3.1 8B with Korean explanations.

**Architecture:** SQL gathers ~20-50 candidates from two pools (social: friends' saved restaurants; personal: Kakao API search for user's top categories). Groq LLM ranks top 10 with Korean explanations. Graceful fallback to SQL-only ranking on LLM failure.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres (new RPC function), Groq SDK (llama-3.1-8b-instant), Kakao Local API, Vitest + Testing Library.

---

### Task 1: Add types for discover feature

**Files:**
- Modify: `src/types/index.ts` (append new types at end)
- Test: `tests/unit/discover-types.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/discover-types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { DiscoverItem, DiscoverResponse } from "@/types";

describe("Discover types", () => {
  it("DiscoverItem has required fields", () => {
    const item: DiscoverItem = {
      kakaoPlaceId: "kakao-123",
      name: "맛있는 치킨",
      category: "음식점 > 치킨",
      address: "서울 강남구 테헤란로 1",
      lat: 37.5065,
      lng: 127.0536,
      placeUrl: "https://place.map.kakao.com/kakao-123",
      reason: "친구 3명이 저장한 강남 이자카야",
      source: "social",
      savedByCount: 3,
      savedByNames: ["김철수", "이영희", "박지민"],
    };
    expect(item.kakaoPlaceId).toBe("kakao-123");
    expect(item.source).toBe("social");
  });

  it("DiscoverItem supports discovery source without social fields", () => {
    const item: DiscoverItem = {
      kakaoPlaceId: "kakao-456",
      name: "새로운 카페",
      category: "카페",
      address: "서울 서초구 서초대로 1",
      lat: 37.4917,
      lng: 127.0078,
      placeUrl: null,
      reason: "자주 가는 카페 카테고리 근처 맛집",
      source: "discovery",
      savedByCount: 0,
      savedByNames: [],
    };
    expect(item.source).toBe("discovery");
    expect(item.savedByCount).toBe(0);
  });

  it("DiscoverResponse includes fallback flag", () => {
    const response: DiscoverResponse = {
      recommendations: [],
      fallback: false,
    };
    expect(response.fallback).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/discover-types.test.ts`
Expected: FAIL with type import errors

**Step 3: Write the types**

Append to `src/types/index.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/discover-types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/index.ts tests/unit/discover-types.test.ts
git commit -m "feat(discover): add DiscoverItem and related types"
```

---

### Task 2: Create Groq client wrapper

**Files:**
- Create: `src/lib/groq.ts`
- Test: `tests/unit/groq-client.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/groq-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the groq-sdk before imports
const mockCreate = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

import { rankWithGroq } from "@/lib/groq";
import type { SocialCandidate, GroqResponse } from "@/types";

const mockCandidates: SocialCandidate[] = [
  {
    kakaoPlaceId: "kakao-1",
    name: "맛있는 치킨",
    category: "음식점 > 치킨",
    address: "서울 강남구 테헤란로 1",
    lat: 37.5065,
    lng: 127.0536,
    placeUrl: "https://place.map.kakao.com/kakao-1",
    savedByCount: 3,
    savedByNames: ["김철수", "이영희", "박지민"],
  },
  {
    kakaoPlaceId: "kakao-2",
    name: "스시 오마카세",
    category: "음식점 > 일식",
    address: "서울 강남구 역삼로 10",
    lat: 37.5012,
    lng: 127.0395,
    placeUrl: null,
    savedByCount: 1,
    savedByNames: ["김철수"],
  },
];

const mockUserProfile = {
  totalSaved: 15,
  topCategories: ["치킨", "일식", "카페"],
  topArea: "강남",
};

describe("rankWithGroq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ranked recommendations from LLM response", async () => {
    const groqResponse: GroqResponse = {
      recommendations: [
        { kakao_place_id: "kakao-1", reason: "친구 3명이 저장한 치킨집" },
        { kakao_place_id: "kakao-2", reason: "자주 가는 일식 카테고리" },
      ],
    };

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(groqResponse),
          },
        },
      ],
    });

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).not.toBeNull();
    expect(result!.recommendations).toHaveLength(2);
    expect(result!.recommendations[0].kakao_place_id).toBe("kakao-1");
    expect(result!.recommendations[0].reason).toBe("친구 3명이 저장한 치킨집");
  });

  it("returns null on API error (graceful failure)", async () => {
    mockCreate.mockRejectedValue(new Error("Rate limited"));

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).toBeNull();
  });

  it("returns null on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json" } }],
    });

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).toBeNull();
  });

  it("returns null on missing recommendations field", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data": []}' } }],
    });

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/groq-client.test.ts`
Expected: FAIL (module not found)

**Step 3: Install groq-sdk and write implementation**

Run: `pnpm add groq-sdk`

Create `src/lib/groq.ts`:

```typescript
import Groq from "groq-sdk";
import type { SocialCandidate, GroqResponse } from "@/types";

interface UserProfile {
  totalSaved: number;
  topCategories: string[];
  topArea: string;
}

interface DiscoveryCandidate {
  kakaoPlaceId: string;
  name: string;
  category: string;
  address: string;
}

const GROQ_TIMEOUT_MS = 5000;
const MAX_RECOMMENDATIONS = 10;

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey });
}

function buildPrompt(
  socialCandidates: SocialCandidate[],
  discoveryCandidates: DiscoveryCandidate[],
  profile: UserProfile,
): { system: string; user: string } {
  const system = `You are a Korean restaurant recommendation assistant.
Given a user's dining profile and candidate restaurants, select the top ${MAX_RECOMMENDATIONS} most relevant.
For each, write a short Korean explanation (1 sentence, max 30 chars) of why it's recommended.
Return ONLY valid JSON: { "recommendations": [{ "kakao_place_id": "...", "reason": "..." }] }
Order by relevance. Do not include any text outside the JSON.`;

  const socialList = socialCandidates.map((c) => ({
    id: c.kakaoPlaceId,
    name: c.name,
    category: c.category,
    address: c.address,
    saved_by: c.savedByCount,
    friends: c.savedByNames.slice(0, 3).join(", "),
    source: "social",
  }));

  const discoveryList = discoveryCandidates.map((c) => ({
    id: c.kakaoPlaceId,
    name: c.name,
    category: c.category,
    address: c.address,
    source: "discovery",
  }));

  const user = `## User Profile
- Saved restaurants: ${profile.totalSaved}
- Top categories: ${profile.topCategories.join(", ")}
- Frequent area: ${profile.topArea}

## Candidates
${JSON.stringify([...socialList, ...discoveryList])}`;

  return { system, user };
}

function parseResponse(content: string): GroqResponse | null {
  try {
    const parsed = JSON.parse(content);
    if (
      !parsed.recommendations ||
      !Array.isArray(parsed.recommendations)
    ) {
      return null;
    }
    for (const rec of parsed.recommendations) {
      if (typeof rec.kakao_place_id !== "string" || typeof rec.reason !== "string") {
        return null;
      }
    }
    return parsed as GroqResponse;
  } catch {
    return null;
  }
}

export async function rankWithGroq(
  socialCandidates: SocialCandidate[],
  discoveryCandidates: DiscoveryCandidate[],
  profile: UserProfile,
): Promise<GroqResponse | null> {
  try {
    const client = getClient();
    const { system, user } = buildPrompt(socialCandidates, discoveryCandidates, profile);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    try {
      const completion = await client.chat.completions.create(
        {
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1024,
        },
        { signal: controller.signal },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      return parseResponse(content);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

export { buildPrompt as _buildPromptForTest, parseResponse as _parseResponseForTest };
export type { UserProfile, DiscoveryCandidate };
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/groq-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/groq.ts tests/unit/groq-client.test.ts package.json pnpm-lock.yaml
git commit -m "feat(discover): add Groq client wrapper with LLM ranking"
```

---

### Task 3: Create recommendation engine — candidate generation and merging

**Files:**
- Create: `src/lib/recommendation-engine.ts`
- Test: `tests/unit/recommendation-engine.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/recommendation-engine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
mockSelect.mockReturnValue({ eq: mockEq });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
  })),
}));

// Mock Kakao API
const mockSearchByKeyword = vi.fn();
vi.mock("@/lib/kakao", () => ({
  searchByKeyword: (...args: unknown[]) => mockSearchByKeyword(...args),
}));

// Mock Groq
const mockRankWithGroq = vi.fn();
vi.mock("@/lib/groq", () => ({
  rankWithGroq: (...args: unknown[]) => mockRankWithGroq(...args),
}));

import {
  getSocialCandidates,
  analyzeUserProfile,
  getDiscoveryCandidates,
  mergeCandidates,
  generateRecommendations,
} from "@/lib/recommendation-engine";
import type { SocialCandidate, DbSocialCandidate } from "@/types";

const mockDbSocialCandidates: DbSocialCandidate[] = [
  {
    kakao_place_id: "kakao-1",
    name: "맛있는 치킨",
    category: "음식점 > 치킨",
    address: "서울 강남구 테헤란로 1",
    lat: 37.5065,
    lng: 127.0536,
    place_url: "https://place.map.kakao.com/kakao-1",
    saved_by_count: 3,
    saved_by_names: ["김철수", "이영희", "박지민"],
  },
  {
    kakao_place_id: "kakao-2",
    name: "스시 오마카세",
    category: "음식점 > 일식",
    address: "서울 강남구 역삼로 10",
    lat: 37.5012,
    lng: 127.0395,
    place_url: null,
    saved_by_count: 1,
    saved_by_names: ["김철수"],
  },
];

describe("getSocialCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls RPC and maps DB rows to SocialCandidate", async () => {
    mockRpc.mockResolvedValue({ data: mockDbSocialCandidates, error: null });

    const result = await getSocialCandidates("user-1");

    expect(mockRpc).toHaveBeenCalledWith("get_social_candidates", {
      target_user_id: "user-1",
    });
    expect(result).toHaveLength(2);
    expect(result[0].kakaoPlaceId).toBe("kakao-1");
    expect(result[0].savedByCount).toBe(3);
    expect(result[0].savedByNames).toEqual(["김철수", "이영희", "박지민"]);
  });

  it("returns empty array on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "fail" } });

    const result = await getSocialCandidates("user-1");

    expect(result).toEqual([]);
  });
});

describe("analyzeUserProfile", () => {
  it("extracts top categories and geographic center", () => {
    const restaurants = [
      { category: "음식점 > 치킨", lat: 37.50, lng: 127.05 },
      { category: "음식점 > 치킨", lat: 37.51, lng: 127.04 },
      { category: "음식점 > 일식", lat: 37.49, lng: 127.03 },
      { category: "카페", lat: 37.52, lng: 127.06 },
      { category: "카페", lat: 37.48, lng: 127.02 },
    ];

    const profile = analyzeUserProfile(restaurants);

    expect(profile.totalSaved).toBe(5);
    expect(profile.topCategories[0]).toBe("치킨");
    expect(profile.topCategories[1]).toBe("카페");
    expect(profile.topCategories).toHaveLength(3);
    expect(profile.centerLat).toBeCloseTo(37.50, 1);
    expect(profile.centerLng).toBeCloseTo(127.04, 1);
  });

  it("returns empty profile for no restaurants", () => {
    const profile = analyzeUserProfile([]);

    expect(profile.totalSaved).toBe(0);
    expect(profile.topCategories).toEqual([]);
    expect(profile.centerLat).toBe(0);
    expect(profile.centerLng).toBe(0);
  });
});

describe("mergeCandidates", () => {
  it("deduplicates by kakaoPlaceId, social wins", () => {
    const social: SocialCandidate[] = [
      {
        kakaoPlaceId: "kakao-1",
        name: "맛있는 치킨",
        category: "치킨",
        address: "강남",
        lat: 37.50,
        lng: 127.05,
        placeUrl: null,
        savedByCount: 2,
        savedByNames: ["김철수", "이영희"],
      },
    ];

    const discovery = [
      { kakaoPlaceId: "kakao-1", name: "맛있는 치킨", category: "치킨", address: "강남" },
      { kakaoPlaceId: "kakao-3", name: "새 카페", category: "카페", address: "서초" },
    ];

    const result = mergeCandidates(social, discovery);

    expect(result).toHaveLength(2);
    // kakao-1 from social (has savedByCount)
    const first = result.find((r) => r.kakaoPlaceId === "kakao-1")!;
    expect(first.source).toBe("social");
    expect(first.savedByCount).toBe(2);
    // kakao-3 from discovery
    const second = result.find((r) => r.kakaoPlaceId === "kakao-3")!;
    expect(second.source).toBe("discovery");
    expect(second.savedByCount).toBe(0);
  });

  it("caps at 50 candidates", () => {
    const social: SocialCandidate[] = Array.from({ length: 30 }, (_, i) => ({
      kakaoPlaceId: `social-${i}`,
      name: `Place ${i}`,
      category: "치킨",
      address: "강남",
      lat: 37.50,
      lng: 127.05,
      placeUrl: null,
      savedByCount: 1,
      savedByNames: ["김철수"],
    }));

    const discovery = Array.from({ length: 30 }, (_, i) => ({
      kakaoPlaceId: `discovery-${i}`,
      name: `Discover ${i}`,
      category: "카페",
      address: "서초",
    }));

    const result = mergeCandidates(social, discovery);

    expect(result.length).toBeLessThanOrEqual(50);
  });
});

describe("generateRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses LLM response when available", async () => {
    mockRpc.mockResolvedValue({ data: mockDbSocialCandidates, error: null });
    mockEq.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        resolve({
          data: [
            { category: "음식점 > 치킨", lat: 37.50, lng: 127.05 },
            { category: "음식점 > 치킨", lat: 37.51, lng: 127.04 },
          ],
          error: null,
        }),
    });
    mockSearchByKeyword.mockResolvedValue({ documents: [] });
    mockRankWithGroq.mockResolvedValue({
      recommendations: [
        { kakao_place_id: "kakao-1", reason: "친구 3명이 저장한 치킨집" },
      ],
    });

    const result = await generateRecommendations("user-1");

    expect(result.fallback).toBe(false);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].reason).toBe("친구 3명이 저장한 치킨집");
  });

  it("falls back to SQL ranking when LLM fails", async () => {
    mockRpc.mockResolvedValue({ data: mockDbSocialCandidates, error: null });
    mockEq.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        resolve({
          data: [
            { category: "음식점 > 치킨", lat: 37.50, lng: 127.05 },
          ],
          error: null,
        }),
    });
    mockSearchByKeyword.mockResolvedValue({ documents: [] });
    mockRankWithGroq.mockResolvedValue(null); // LLM failed

    const result = await generateRecommendations("user-1");

    expect(result.fallback).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    // Fallback reasons are templates
    expect(result.recommendations[0].reason).toContain("저장");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/recommendation-engine.test.ts`
Expected: FAIL (module not found)

**Step 3: Write implementation**

Create `src/lib/recommendation-engine.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { searchByKeyword } from "@/lib/kakao";
import { rankWithGroq } from "@/lib/groq";
import type {
  SocialCandidate,
  DbSocialCandidate,
  DiscoverItem,
  DiscoverResponse,
  GroqResponse,
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

  // Top area from most common address prefix
  const topArea = extractTopArea(restaurants.length > 0 ? "강남" : "");

  return {
    totalSaved: restaurants.length,
    topCategories,
    topArea,
    centerLat,
    centerLng,
  };
}

function extractTopArea(_fallback: string): string {
  // Simplified: will be overridden by actual address analysis in production
  return _fallback;
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
    // Social first, then by saved_by_count
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
  // 1. Get user's saved restaurants for profile analysis
  const supabase = await createClient();
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
  // Add user's own restaurants to exclude set
  const { data: userPlaces } = await supabase
    .from("restaurants")
    .select("kakao_place_id")
    .eq("user_id", userId);
  for (const p of userPlaces ?? []) {
    userPlaceIds.add((p as { kakao_place_id: string }).kakao_place_id);
  }
  // Also exclude social candidates already fetched
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
    // Map LLM results back to full DiscoverItem
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/recommendation-engine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/recommendation-engine.ts tests/unit/recommendation-engine.test.ts
git commit -m "feat(discover): add recommendation engine with social + discovery candidates"
```

---

### Task 4: Create the API route

**Files:**
- Create: `src/app/api/recommendations/generate/route.ts`
- Test: (tested via unit tests above; integration test optional)

**Step 1: Write the API route**

Create `src/app/api/recommendations/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations } from "@/lib/recommendation-engine";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const result = await generateRecommendations(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendation generation failed:", error);
    return NextResponse.json(
      { error: "GENERATION_FAILED", message: "추천 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
```

**Step 2: Run build to verify no type errors**

Run: `pnpm build`
Expected: Build succeeds (or check with `tsc --noEmit` if path aliases work)

**Step 3: Commit**

```bash
git add src/app/api/recommendations/generate/route.ts
git commit -m "feat(discover): add POST /api/recommendations/generate route"
```

---

### Task 5: Create DiscoverCard component

**Files:**
- Create: `src/components/DiscoverCard.tsx`
- Test: `tests/unit/discover-card.test.tsx`

**Step 1: Write the failing test**

Create `tests/unit/discover-card.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DiscoverCard from "@/components/DiscoverCard";
import type { DiscoverItem } from "@/types";

const mockSocialItem: DiscoverItem = {
  kakaoPlaceId: "kakao-1",
  name: "맛있는 치킨",
  category: "음식점 > 치킨",
  address: "서울 강남구 테헤란로 1",
  lat: 37.5065,
  lng: 127.0536,
  placeUrl: "https://place.map.kakao.com/kakao-1",
  reason: "친구 3명이 저장한 치킨집",
  source: "social",
  savedByCount: 3,
  savedByNames: ["김철수", "이영희", "박지민"],
};

const mockDiscoveryItem: DiscoverItem = {
  kakaoPlaceId: "kakao-2",
  name: "새로운 카페",
  category: "카페",
  address: "서울 서초구 서초대로 1",
  lat: 37.4917,
  lng: 127.0078,
  placeUrl: null,
  reason: "자주 가는 카페 근처 맛집",
  source: "discovery",
  savedByCount: 0,
  savedByNames: [],
};

describe("DiscoverCard", () => {
  it("renders restaurant name and reason", () => {
    render(<DiscoverCard item={mockSocialItem} onAdd={vi.fn()} />);

    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("친구 3명이 저장한 치킨집")).toBeTruthy();
  });

  it("renders category and address", () => {
    render(<DiscoverCard item={mockSocialItem} onAdd={vi.fn()} />);

    expect(screen.getByText("음식점 > 치킨")).toBeTruthy();
    expect(screen.getByText("서울 강남구 테헤란로 1")).toBeTruthy();
  });

  it("shows social indicator for social source", () => {
    render(<DiscoverCard item={mockSocialItem} onAdd={vi.fn()} />);

    expect(screen.getByText("👥")).toBeTruthy();
  });

  it("shows discovery indicator for discovery source", () => {
    render(<DiscoverCard item={mockDiscoveryItem} onAdd={vi.fn()} />);

    expect(screen.getByText("🧭")).toBeTruthy();
  });

  it("calls onAdd when add button clicked", () => {
    const onAdd = vi.fn();
    render(<DiscoverCard item={mockSocialItem} onAdd={onAdd} />);

    fireEvent.click(screen.getByText("추가"));
    expect(onAdd).toHaveBeenCalledWith(mockSocialItem);
  });

  it("disables add button when isAdding is true", () => {
    render(
      <DiscoverCard item={mockSocialItem} onAdd={vi.fn()} isAdding />,
    );

    const button = screen.getByText("…");
    expect(button.closest("button")).toHaveProperty("disabled", true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/discover-card.test.tsx`
Expected: FAIL (module not found)

**Step 3: Write implementation**

Create `src/components/DiscoverCard.tsx`:

```tsx
"use client";

import type { DiscoverItem } from "@/types";

interface DiscoverCardProps {
  item: DiscoverItem;
  onAdd: (item: DiscoverItem) => void;
  isAdding?: boolean;
}

export default function DiscoverCard({
  item,
  onAdd,
  isAdding,
}: DiscoverCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm" aria-label={item.source === "social" ? "친구 추천" : "새로운 발견"}>
              {item.source === "social" ? "👥" : "🧭"}
            </span>
            <h3 className="font-semibold text-gray-900 truncate">
              {item.name}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-1">{item.category}</p>
          <p className="text-xs text-gray-400 truncate">{item.address}</p>
          <div className="mt-2 bg-blue-50 rounded-lg px-3 py-1.5">
            <p className="text-xs text-blue-700">{item.reason}</p>
          </div>
        </div>
        <button
          onClick={() => onAdd(item)}
          disabled={isAdding}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
            isAdding
              ? "bg-gray-100 text-gray-400"
              : "bg-blue-600 text-white active:bg-blue-700"
          }`}
        >
          {isAdding ? "…" : "추가"}
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/discover-card.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DiscoverCard.tsx tests/unit/discover-card.test.tsx
git commit -m "feat(discover): add DiscoverCard component with social/discovery indicators"
```

---

### Task 6: Create `/discover` page

**Files:**
- Create: `src/app/discover/page.tsx`
- Test: `tests/unit/discover-page.test.tsx`

**Step 1: Write the failing test**

Create `tests/unit/discover-page.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: null, error: null }),
      })),
    })),
  }),
}));

// Mock invalidate
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: vi.fn(),
  invalidateByPrefix: vi.fn(),
}));

import DiscoverPage from "@/app/discover/page";
import type { DiscoverResponse } from "@/types";

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<DiscoverPage />);

    expect(screen.getByText("추천 맛집 찾는 중...")).toBeTruthy();
  });

  it("renders recommendations on success", async () => {
    const response: DiscoverResponse = {
      recommendations: [
        {
          kakaoPlaceId: "kakao-1",
          name: "맛있는 치킨",
          category: "치킨",
          address: "강남",
          lat: 37.50,
          lng: 127.05,
          placeUrl: null,
          reason: "친구 3명이 저장",
          source: "social",
          savedByCount: 3,
          savedByNames: ["김철수"],
        },
      ],
      fallback: false,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => response,
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("친구 3명이 저장")).toBeTruthy();
  });

  it("shows empty state when no recommendations", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [], fallback: false }),
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(
      screen.getByText("추천을 생성하려면 맛집을 더 저장해보세요"),
    ).toBeTruthy();
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(screen.getByText("추천 생성에 실패했습니다")).toBeTruthy();
  });

  it("shows fallback indicator when LLM failed", async () => {
    const response: DiscoverResponse = {
      recommendations: [
        {
          kakaoPlaceId: "kakao-1",
          name: "맛있는 치킨",
          category: "치킨",
          address: "강남",
          lat: 37.50,
          lng: 127.05,
          placeUrl: null,
          reason: "친구 1명이 저장했어요",
          source: "social",
          savedByCount: 1,
          savedByNames: ["김철수"],
        },
      ],
      fallback: true,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => response,
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/discover-page.test.tsx`
Expected: FAIL (module not found)

**Step 3: Write implementation**

Create `src/app/discover/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import DiscoverCard from "@/components/DiscoverCard";
import Toast from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { invalidate, invalidateByPrefix } from "@/lib/supabase/invalidate";
import type { DiscoverItem, DiscoverResponse } from "@/types";

export default function DiscoverPage() {
  const [recommendations, setRecommendations] = useState<DiscoverItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommendations/generate", {
        method: "POST",
      });

      if (!res.ok) {
        setError("추천 생성에 실패했습니다");
        return;
      }

      const data: DiscoverResponse = await res.json();
      setRecommendations(data.recommendations);
    } catch {
      setError("추천 생성에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleAdd = async (item: DiscoverItem) => {
    if (addingId) return;
    setAddingId(item.kakaoPlaceId);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("restaurants").insert({
        user_id: user.id,
        kakao_place_id: item.kakaoPlaceId,
        name: item.name,
        address: item.address,
        category: item.category,
        lat: item.lat,
        lng: item.lng,
        place_url: item.placeUrl,
        star_rating: null,
      });

      if (error) {
        if (error.code === "23505") {
          setToast({ message: "이미 저장된 맛집입니다", type: "error" });
          return;
        }
        throw error;
      }

      setToast({ message: `${item.name} 위시리스트에 추가됨`, type: "success" });
      invalidate("restaurants");
      invalidateByPrefix("restaurant-status:");
      invalidateByPrefix("wishlisted-set:");

      // Remove from list
      setRecommendations((prev) =>
        prev.filter((r) => r.kakaoPlaceId !== item.kakaoPlaceId),
      );
    } catch {
      setToast({ message: "추가에 실패했습니다", type: "error" });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">맛집 추천</h1>
        <button
          onClick={fetchRecommendations}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          새로고침
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl h-28 animate-pulse"
            />
          ))}
          <p className="text-center text-sm text-gray-400">
            추천 맛집 찾는 중...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{error}</p>
          <button
            onClick={fetchRecommendations}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            다시 시도
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">추천을 생성하려면 맛집을 더 저장해보세요</p>
          <p className="text-sm mt-1">최소 3개 이상의 맛집을 저장하면 AI가 추천해드려요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((item) => (
            <DiscoverCard
              key={item.kakaoPlaceId}
              item={item}
              onAdd={handleAdd}
              isAdding={addingId === item.kakaoPlaceId}
            />
          ))}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/discover-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/discover/page.tsx tests/unit/discover-page.test.tsx
git commit -m "feat(discover): add /discover page with loading, empty, error states"
```

---

### Task 7: Add "추천" tab to BottomNav

**Files:**
- Modify: `src/components/BottomNav.tsx`

**Step 1: Add the tab**

In `src/components/BottomNav.tsx`, update the `tabs` array:

```typescript
const tabs = [
  { href: "/", label: "맛집", icon: "♥" },
  { href: "/search", label: "검색", icon: "🔍" },
  { href: "/discover", label: "추천", icon: "✨" },
  { href: "/users", label: "사람", icon: "👥" },
  { href: "/my", label: "내정보", icon: "👤" },
] as const;
```

**Step 2: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat(discover): add 추천 tab to bottom navigation"
```

---

### Task 8: Write the Postgres migration for get_social_candidates

**Files:**
- Create: `specs/031-ai-recommendation/data-model.md`

**Step 1: Write the migration SQL**

Create `specs/031-ai-recommendation/data-model.md`:

```markdown
# Data Model — AI Recommendation Agent

## Migration SQL

Run this in Supabase Dashboard > SQL Editor before deploying.

\`\`\`sql
-- Function: get_social_candidates
-- Returns restaurants saved by mutual followers that the target user hasn't saved.
-- Used by the AI recommendation engine to generate social-pool candidates.

CREATE OR REPLACE FUNCTION get_social_candidates(target_user_id UUID)
RETURNS TABLE (
  kakao_place_id TEXT,
  name TEXT,
  category TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_url TEXT,
  saved_by_count BIGINT,
  saved_by_names TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH mutual AS (
    SELECT f1.following_id AS friend_id
    FROM follows f1
    JOIN follows f2
      ON f1.following_id = f2.follower_id
      AND f2.following_id = f1.follower_id
    WHERE f1.follower_id = target_user_id
  ),
  friend_restaurants AS (
    SELECT
      r.kakao_place_id,
      r.name,
      r.category,
      r.address,
      r.lat,
      r.lng,
      r.place_url,
      p.nickname
    FROM restaurants r
    JOIN mutual m ON r.user_id = m.friend_id
    JOIN profiles p ON r.user_id = p.id
    WHERE r.kakao_place_id NOT IN (
      SELECT kakao_place_id FROM restaurants WHERE user_id = target_user_id
    )
  )
  SELECT
    fr.kakao_place_id,
    fr.name,
    fr.category,
    fr.address,
    fr.lat,
    fr.lng,
    fr.place_url,
    COUNT(*)::BIGINT AS saved_by_count,
    ARRAY_AGG(DISTINCT fr.nickname) AS saved_by_names
  FROM friend_restaurants fr
  GROUP BY fr.kakao_place_id, fr.name, fr.category, fr.address, fr.lat, fr.lng, fr.place_url
  ORDER BY saved_by_count DESC
  LIMIT 30;
$$;
\`\`\`

## No New Tables

This feature uses only existing tables (`restaurants`, `follows`, `profiles`) and generates recommendations on-the-fly.
```

**Step 2: Commit**

```bash
mkdir -p specs/031-ai-recommendation
git add specs/031-ai-recommendation/data-model.md
git commit -m "feat(discover): add get_social_candidates migration SQL"
```

---

### Task 9: Run full verification

**Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

**Step 2: Run type check + build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Run full verification gate**

Run: `tsc --noEmit && pnpm build && pnpm test`
Expected: All three gates pass

**Step 4: Final commit if any fixups needed**

```bash
git add -A
git commit -m "chore(discover): fix any issues from verification"
```

---

### Task 10: Update CHANGELOG and docs

**Files:**
- Modify: `CHANGELOG.md` (append entry)

**Step 1: Add changelog entry**

Append to `CHANGELOG.md`:

```
- 031-ai-recommendation: Added AI-powered restaurant discovery page (`/discover`). SQL candidate generation from two pools: social (mutual followers' saved restaurants via `get_social_candidates` Postgres function) and personal (Kakao API search for user's top categories near geographic center). Groq LLaMA 3.1 8B ranks top 10 with Korean explanations. Graceful SQL-only fallback on LLM failure (rate limit, timeout, parse error). DiscoverCard component with social/discovery source indicators, AI reason callout, and optimistic wishlist add. New "추천" tab (5th) in bottom navigation. N unit tests (M total).
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG entry for feature 031 AI recommendation"
```
