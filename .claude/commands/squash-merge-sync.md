---
description: After a squash-merged PR, cherry-pick orphaned commits from the feature branch onto main
---

## Context

- Current branch: !`git branch --show-current`
- Worktrees: !`git worktree list`
- Remote main: !`git log --oneline origin/main -3`
- Feature branch log: !`git log --oneline origin/main..HEAD`

## Your Task

The user just had a PR squash-merged into main. The feature branch may have commits that were added AFTER the PR was opened (docs updates, hotfixes, etc.) — these are NOT included in the squash.

1. **Fetch**: `git fetch origin`

2. **Identify orphaned commits** on the current (or specified) branch:
   - `git log --oneline origin/main..HEAD`
   - If no commits found, report that main is already up to date and stop

3. **Check if main is locked to a worktree**:
   - If yes: create a temp branch from `origin/main`, cherry-pick there, then `git branch -f main <temp>` and delete temp
   - If no: `git checkout main && git pull origin main`, then cherry-pick

4. **Cherry-pick** each orphaned commit in order (oldest first):
   - `git cherry-pick <sha1> [<sha2> ...]`
   - If conflicts arise, report them and stop for user resolution

5. **Verify build**: `pnpm build`

6. **Push**: `git push origin main`

7. Report which commits were cherry-picked and the final state of main.

## Arguments

Optional: $ARGUMENTS — name of the feature branch to sync from (defaults to current branch)
