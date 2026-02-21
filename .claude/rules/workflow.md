# Workflow Rules

- Always create a git worktree (via `/worktree-setup`) before starting work on a new feature. Never work directly on `main`.
- Create worktree branches from `main`: run `git checkout main` first. Creating from a feature branch causes "already checked out" errors.

## Verification

- Run all three gates before deploying or closing a branch: `tsc --noEmit` → `pnpm build` → `pnpm test`. Use `/verify-build`.
- After deleting files or modules, run `rm -rf .next` before `tsc --noEmit` — stale cache references deleted files.
- After squash-merging, grep tests for deleted imports before considering cleanup done: `grep -r "deleted-function\|deleted-route" tests/`

## Before Ending a Session

- Always commit or stash before a context window ends — branches and working tree state are not preserved across Claude sessions.
- Custom commands (`.claude/commands/*.md`) must be committed immediately after creation. Review `git status` before push to catch orphaned `??` files.
- After running `/speckit.specify` on main, commit the created spec files before switching to a worktree — untracked specs cause `git pull` conflicts after PR merge.
