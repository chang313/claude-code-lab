# AI Chat Recommendation Agent — Design Document

**Date**: 2026-03-01
**Feature**: Replace /discover auto-recommendations with a conversational AI agent
**Status**: Approved

## Summary

Replace the current auto-generated recommendation list on `/discover` with an interactive chat interface. Users type natural-language prompts (e.g., "매운 거 먹고 싶어", "강남 근처 일식 추천해줘") and the agent recommends places from their **own saved places only** (restaurants table). The agent supports multi-turn conversation with streaming responses and inline place cards.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data scope | User's saved places only | Simpler, more personal — "help me pick from what I already have" |
| UI placement | Replace current /discover page | Cleaner UX, single purpose |
| LLM provider | Groq (llama-3.1-8b-instant) | Already integrated, fast, free-tier friendly |
| Chat style | Multi-turn | Natural follow-up questions, better UX |
| Result format | Chat bubbles with inline place cards | Rich and interactive |
| Response UX | Streaming (SSE) | Feels responsive even with slower LLM calls |

## Architecture

```
Client (/discover)                    Server
┌─────────────────┐                  ┌─────────────────────────────┐
│ Chat UI          │  POST /api/     │ /api/agent/chat             │
│ - Messages list  │  agent/chat     │                             │
│ - Input bar      │ ──────────────► │ 1. Auth check               │
│ - Place cards    │  { messages[] } │ 2. Fetch saved places       │
│ - Suggestions    │                 │ 3. Build system prompt      │
│                  │  ◄───────────── │ 4. Groq streaming API       │
│                  │  SSE stream     │ 5. Pipe SSE response        │
└─────────────────┘                  └─────────────────────────────┘
```

### State Management

- **Conversation state**: Client-side React state (`messages[]` array). Resets on page refresh. No database persistence.
- **Place data**: Fetched once on page load via `useWishlist()` hook. Used to resolve `<<PLACE:id>>` markers into card data.
- **Message trimming**: Keep last 20 messages to stay within Groq context limits.

## Data Types

```typescript
type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }  // may contain <<PLACE:id>> markers
```

## Component Tree

```
DiscoverPage (page.tsx)
├── ChatMessageList
│   ├── UserBubble          — right-aligned, blue bg
│   ├── AssistantBubble     — left-aligned, white bg
│   │   ├── Text segments   — parsed between place markers
│   │   └── PlaceCard       — inline card for each <<PLACE:id>>
│   └── TypingIndicator     — shown while streaming
└── ChatInput               — sticky bottom, text input + send button
```

## API Design

### `POST /api/agent/chat`

**Request body**:
```json
{
  "messages": [
    { "role": "user", "content": "매운 거 먹고 싶어" }
  ]
}
```

**Response**: `text/event-stream` (SSE), each chunk is a text delta from Groq.

### System Prompt

```
You are a friendly Korean restaurant recommendation assistant.
The user has saved the following places. ONLY recommend from this list.

When recommending a place, include its marker: <<PLACE:kakao_place_id>>

Rules:
- Answer in Korean
- Only recommend places from the user's saved list below
- Include <<PLACE:id>> marker right after mentioning each place name
- If the user's request is unclear, ask a clarifying question
- Consider star_rating (null=wishlist/not yet visited, 1-5=visited rating)
- Be concise: 2-3 recommendations max unless asked for more

User's saved places:
[ { "id": "12345", "name": "매운집", "category": "음식점 > 한식 > 찌개", "address": "서울 강남구...", "star_rating": 4 }, ... ]
```

### Place Marker Parsing

As streamed text arrives:
1. Accumulate in buffer
2. Scan for `<<PLACE:...>>` pattern
3. Text before marker → render as text segment
4. Marker → look up place by kakao_place_id → render `PlaceCard` inline
5. Invalid/unknown IDs → render as plain text (skip card)

## PlaceCard (inline)

Compact card showing:
- Name (bold) + category (gray, small)
- Address (truncated)
- Star rating (★★★★☆) or "위시리스트" badge
- Tap → opens place_url in new tab

## Suggested Prompts

On empty conversation, show tappable chips:
- "오늘 뭐 먹지?"
- "매운 거 추천해줘"
- "카페 가고 싶어"
- "별점 높은 곳 알려줘"

## Error Handling

| Scenario | Handling |
|---|---|
| User has <3 saved places | Friendly message + link to search page |
| Groq API fails/timeout | Error toast, keep history, allow retry |
| Invalid place marker | Render as plain text |
| Network error mid-stream | Append "응답이 중단되었어요" to current message |
| Empty Groq response | "답변을 생성하지 못했어요. 다시 질문해주세요." |

## Edge Cases

- **Rapid re-sends**: Disable send button while streaming
- **Long conversations**: Trim to last 20 messages
- **Page refresh**: Conversation resets (acceptable for v1)
- **Unauthenticated**: Redirect to login (existing auth layout)

## Out of Scope (YAGNI)

- Chat history persistence (database storage)
- Voice input
- Map integration from chat (card tap opens Kakao Maps link only)
- Sharing chat conversations
- Feedback/thumbs-up on responses
- External place discovery (Kakao API / social candidates)
