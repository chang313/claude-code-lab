---
description: After a PR is squash-merged, sync main, clean up the feature branch worktree, and deploy to Vercel
---

## Context

- Current branch: !`git rev-parse --abbrev-ref HEAD`
- Worktrees: !`git worktree list`
- Remote main: !`git log --oneline origin/main -3`
- Git status: !`git status --short`

## Your Task

Complete the post-merge workflow for a feature branch. The user will provide the branch name as $ARGUMENTS.

### Phase 1: Sync main

1. **Fetch**: `git fetch --prune origin`

2. **Ensure on main**: If not on main, switch to it:
   - `git checkout main`

3. **Fast-forward main**: `git pull --ff-only origin main`
   - If fast-forward fails, report the conflict and stop

### Phase 2: Clean up feature branch

4. **Run `/feature-cleanup $ARGUMENTS`** to:
   - Remove the worktree
   - Delete local and remote branches
   - Clean stray files

### Phase 3: Verify and deploy

5. **Build check**: `pnpm build`
   - If build fails, report errors and stop before deploying

6. **Deploy to Vercel**: `vercel --prod --yes`
   - Report the deployment URL when complete

7. **Report** summary:
   - Main synced to which commit
   - Branch/worktree cleaned up
   - Deployment URL

## Arguments

$ARGUMENTS — the feature branch name to clean up (required)
