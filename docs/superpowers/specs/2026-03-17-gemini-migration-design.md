# Gemini Migration Design

## Problem

The AI chatbot uses Groq's `llama-3.1-8b-instant` with a 6000 token per-request limit. Multi-turn conversations with Korean text frequently exceed this budget, causing intermittent errors despite token estimation and place truncation logic.

## Solution

Migrate from Groq (LLaMA 3.1) to Google Gemini 2.5 Flash. The free tier provides 250K TPM and 1M token context window, eliminating the token budget problem entirely.

## Scope

### Changed Files

| File | Change |
|------|--------|
| `src/app/api/agent/chat/route.ts` | Replace Groq SDK with Google AI SDK, remove token budgeting |
| `tests/unit/chat-api.test.ts` | Update mocks and remove budget-related tests |
| `package.json` | Swap `groq-sdk` → `@google/generative-ai` |
| `.env.example` | Replace `GROQ_API_KEY` → `GEMINI_API_KEY` |

### Unchanged Files

- `src/hooks/use-chat.ts` — SSE consumption unchanged
- `src/components/ChatInput.tsx`, `AssistantBubble.tsx`, `ChatPlaceCard.tsx` — no changes
- `src/lib/chat-parser.ts` — marker format unchanged

## Design Details

### route.ts

**Remove:**
- `TOKEN_LIMIT`, `MAX_COMPLETION_TOKENS`, `SAFETY_MARGIN`, `SYSTEM_INSTRUCTION_TOKENS` constants
- `estimateTokens()` function
- `placesBudget` calculation and `BUDGET_EXCEEDED` early return
- Token-aware place truncation in `buildSystemPrompt`

**Keep:**
- `MAX_MESSAGES = 20` (reasonable conversation cap)
- System prompt template (place markers, Korean, rules)
- Place sorting logic (starred first, descending by rating)
- SSE streaming format (`data: {"content":"..."}\n\n` + `data: [DONE]\n\n`)

**Add:**
- `@google/generative-ai` SDK import (`GoogleGenerativeAI`)
- `GEMINI_API_KEY` env var check
- `gemini-2.5-flash` model initialization
- Gemini streaming via `generateContentStream()`
- Error mapping: Google AI errors → 429 (rate limit) or 502 (other)

**Simplified `buildSystemPrompt`:**
- Accepts all places without truncation
- No token budget parameter
- Returns system prompt with full place list

### Error Handling

Gemini SDK throws `GoogleGenerativeAIError` on failures. Map:
- 429 (rate limit) → 429 response
- 400 (bad request) → 429 response (same user-facing message)
- Other errors → 502 response

### Tests

**Remove tests:**
- `truncates places when they exceed token budget` — no truncation
- `returns 413 BUDGET_EXCEEDED when conversation too long` — no budget

**Update tests:**
- Mock `@google/generative-ai` instead of `groq-sdk`
- `GROQ_API_KEY` → `GEMINI_API_KEY` in env stubs
- Gemini stream mock shape (different from Groq's async iterator)

**Keep tests (updated mocks):**
- 401 unauthorized
- 400 empty messages
- 500 missing API key
- 200 streaming response
- Starred place priority
- 429 rate limit errors
- 502 non-API errors
- Zero places
