---
description: Create a git worktree for a feature branch with dependencies installed
---

## Context

- Current branch: !`git rev-parse --abbrev-ref HEAD`
- Existing worktrees: !`git worktree list`

## Your Task

Set up a git worktree for parallel feature development. The user will provide the branch name as $ARGUMENTS.

1. **Validate** the branch exists locally or on remote:
   - Check local: `git branch --list <branch-name>`
   - Check remote: `git ls-remote --heads origin <branch-name>`
   - If neither exists, report error and stop

2. **Derive worktree path** from the branch name:
   - Strip any leading digits and dash prefix to get the feature name
   - Path: `../<branch-name>/` (relative to repo root)
   - If path already exists, report it and stop

3. **Create worktree**:
   - `git worktree add ../<branch-name> <branch-name>`
   - If branch is only on remote: `git worktree add ../<branch-name> -b <branch-name> origin/<branch-name>`

4. **Install dependencies** in the new worktree:
   - `cd ../<branch-name> && pnpm install`

5. **Report** the worktree path and suggest next steps:
   - "Worktree ready at `../<branch-name>/`"
   - "Run `/speckit.plan` or `/speckit.implement` to continue"
   - Pair with `/feature-cleanup <branch-name>` when done

## Arguments

$ARGUMENTS — the feature branch name to set up (required)
