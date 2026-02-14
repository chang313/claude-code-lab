<!--
  Sync Impact Report
  ==================
  Version change: 0.0.0 (template) → 1.0.0
  Modified principles: N/A (initial creation)
  Added sections:
    - Principle I: Code Quality
    - Principle II: Testing Standards
    - Principle III: User Experience Consistency
    - Principle IV: Performance Requirements
    - Principle V: Simplicity
    - Section: Quality Gates
    - Section: Development Workflow
    - Section: Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ aligned (Constitution Check section is dynamic)
    - .specify/templates/spec-template.md ✅ aligned (success criteria support performance metrics)
    - .specify/templates/tasks-template.md ✅ aligned (test-first and polish phases present)
  Deferred items: None
-->
# claude-code-lab Constitution

## Core Principles

### I. Code Quality

- All code MUST pass static analysis (linting, formatting) before merge.
- Functions and modules MUST have a single, clear responsibility.
- Dead code, unused imports, and commented-out code MUST be removed
  before merge.
- All public APIs MUST include type annotations or type signatures
  appropriate to the chosen language.
- Code duplication across modules MUST be extracted into shared
  utilities when three or more instances exist.

### II. Testing Standards

- Every feature MUST include tests that cover the primary user
  scenarios defined in the specification.
- Tests MUST be written before implementation (Red-Green-Refactor).
  Implementation code MUST NOT be written until corresponding tests
  exist and fail.
- Unit tests MUST run in isolation with no external dependencies
  (network, filesystem, database) unless explicitly scoped as
  integration tests.
- Integration tests MUST cover cross-module boundaries, API contracts,
  and data persistence layers.
- All tests MUST pass in CI before a pull request can be merged.
  No test SHOULD be skipped without a linked tracking issue.

### III. User Experience Consistency

- All user-facing interfaces MUST follow a single, documented design
  system (component library, color palette, typography, spacing).
- Error messages MUST be actionable: state what went wrong, why, and
  what the user can do to resolve it.
- Loading and transition states MUST provide visual feedback within
  200ms of user action.
- Accessibility MUST meet WCAG 2.1 AA compliance for all new UI
  components.
- Navigation patterns and interaction models MUST remain consistent
  across all features and screens.

### IV. Performance Requirements

- API responses MUST complete within 200ms at p95 under expected load.
- Client-side initial render (Largest Contentful Paint) MUST occur
  within 2.5 seconds on a standard connection.
- Memory usage MUST NOT grow unboundedly; all long-running processes
  MUST be profiled for leaks before release.
- Database queries MUST be reviewed for N+1 patterns and MUST include
  appropriate indexes for filtered/sorted columns.
- Bundle size increases exceeding 10% MUST be justified and approved
  in the pull request.

### V. Simplicity

- Start with the simplest solution that satisfies the specification.
  Complexity MUST be justified with a concrete, current need—not a
  hypothetical future requirement (YAGNI).
- Prefer standard library and existing dependencies over introducing
  new ones. New dependencies MUST be justified in the pull request.
- Abstractions MUST NOT be introduced until at least three concrete
  use cases exist.

## Quality Gates

- **Pre-commit**: Linting and formatting checks MUST pass.
- **Pull Request**: All unit and integration tests MUST pass. Code
  review by at least one other contributor is REQUIRED.
- **Pre-merge**: Constitution compliance MUST be verified—every PR
  description MUST include a checklist confirming adherence to the
  applicable principles above.
- **Release**: Performance benchmarks MUST meet the thresholds defined
  in Principle IV. Accessibility audit MUST confirm WCAG 2.1 AA.

## Development Workflow

- Every feature MUST begin with a specification (`/speckit.specify`)
  before implementation starts.
- Branches MUST follow the naming convention `###-feature-name` tied
  to the feature specification number.
- Commits MUST be atomic—one logical change per commit with a clear,
  descriptive message.
- Pull requests MUST reference the originating specification and
  include a summary of changes, test plan, and constitution checklist.

## Governance

- This constitution supersedes conflicting practices found in other
  project documents. In case of conflict, this document governs.
- Amendments MUST be proposed via pull request with a clear rationale,
  reviewed by at least one contributor, and merged only after approval.
- Each amendment MUST update the version following semantic versioning:
  MAJOR for principle removals or incompatible redefinitions, MINOR
  for new principles or material expansions, PATCH for clarifications
  and wording fixes.
- Compliance with this constitution MUST be verified during every
  code review. Reviewers MUST flag violations before approving.

**Version**: 1.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-15
