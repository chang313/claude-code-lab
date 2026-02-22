# Workflow Rules

- Always create a git worktree and a new branch before starting any task (features, bug fixes, chores, docs). Never work directly on `main`. Use `/worktree-setup` when a branch already exists, or create one manually with `git worktree add ../<branch-name> -b <branch-name> main`.
- Create worktree branches from `main`: run `git checkout main` first. Creating from a feature branch causes "already checked out" errors.

## Verification

- Run all three gates before deploying or closing a branch: `tsc --noEmit` → `pnpm build` → `pnpm test`. Use `/verify-build`.
- After deleting files or modules, run `rm -rf .next` before `tsc --noEmit` — stale cache references deleted files.
- After squash-merging, grep tests for deleted imports before considering cleanup done: `grep -r "deleted-function\|deleted-route" tests/`

## Merge Conflict Resolution

- For spec/task files (`specs/**/*.md`): use `git checkout --ours` to keep the feature branch's version, then `git add` to mark resolved.
- After auto-merge, always verify merged code files — build + test passing confirms correctness.
- `git checkout --ours` = current branch, `--theirs` = incoming branch (not chronological order).

## Before Ending a Session

- Always commit or stash before a context window ends — branches and working tree state are not preserved across Claude sessions.
- Custom commands (`.claude/commands/*.md`) must be committed immediately after creation. Review `git status` before push to catch orphaned `??` files.
- After running `/speckit.specify` on main, commit the created spec files before switching to a worktree — untracked specs cause `git pull` conflicts after PR merge.
