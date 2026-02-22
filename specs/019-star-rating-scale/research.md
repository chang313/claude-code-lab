# Research: Change Star Rating Scale to 5

**Branch**: `019-star-rating-scale` | **Date**: 2026-02-22

## Overview

This feature has no unknowns or NEEDS CLARIFICATION items. The research phase confirms the feasibility of the approach.

## Decision 1: Database Schema Change

**Decision**: No database migration required.
**Rationale**: The `restaurants.star_rating` column is a nullable integer in Supabase Postgres. Integer columns accept any integer value — the 1-3 constraint exists only at the TypeScript application layer via union types. Widening to 1-5 requires no schema change.
**Alternatives considered**:
- Add a CHECK constraint (`star_rating BETWEEN 1 AND 5`) — Rejected: adds a migration step for minimal benefit; the application layer enforces valid values via TypeScript types.

## Decision 2: Existing Data Migration Strategy

**Decision**: No rescaling of existing ratings.
**Rationale**: Rescaling (e.g., mapping 3/3 → 5/5) would alter user intent. A user who rated a restaurant 2/3 ("average") should not have that silently changed to 2/5 ("poor") or 3.3/5. Keeping raw values preserves original user intent and avoids data integrity issues.
**Alternatives considered**:
- Linear rescaling (multiply by 5/3) — Rejected: produces fractional values (2 → 3.33) incompatible with integer-only ratings.
- Proportional mapping (1→2, 2→3, 3→5) — Rejected: arbitrary mapping that doesn't reflect user intent.

## Decision 3: Type Representation

**Decision**: Continue using TypeScript union type `1 | 2 | 3 | 4 | 5` (not a generic `number` with runtime validation).
**Rationale**: Union types provide compile-time exhaustiveness checking. The set of valid values is small and fixed, making a union type the appropriate pattern. This matches the existing codebase pattern.
**Alternatives considered**:
- `number` with runtime range check — Rejected: loses compile-time safety.
- Branded type (`StarRating & { __brand: 'star' }`) — Rejected: over-engineering for 5 fixed values.
