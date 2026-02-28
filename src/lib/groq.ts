import Groq from "groq-sdk";
import type { SocialCandidate, GroqResponse } from "@/types";

export interface UserProfile {
  totalSaved: number;
  topCategories: string[];
  topArea: string;
}

export interface DiscoveryCandidate {
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
