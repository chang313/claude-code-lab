---
description: After a PR is merged, remove the feature worktree, delete local and remote branches, and clean up stray files
---

## Context

- Worktrees: !`git worktree list`
- Local branches: !`git branch -v`
- Untracked files: !`git ls-files --others --exclude-standard | grep '\.png$'`

## Your Task

Clean up after a merged feature branch. The user will provide the branch name as $ARGUMENTS.

1. **Fetch** to update remote tracking: `git fetch --prune origin`

2. **Remove worktree** (if it exists for this branch):
   - Find the worktree path from `git worktree list` matching the branch name
   - Run `git worktree remove --force <path>` (force is safe since PR is already merged)

3. **Delete local branch**:
   - `git branch -D <branch-name>`

4. **Delete remote branch** (if it still exists on origin):
   - Check: `git ls-remote --heads origin <branch-name>`
   - If exists: `git push origin --delete <branch-name>`
   - If not (GitHub auto-deleted): skip, `--prune` in step 1 already cleaned the tracking ref

5. **Clean up stray screenshot/debug files** in the repo root:
   - List untracked `*.png` files from context above
   - If any found, confirm with user before deleting

6. Report what was removed.

## Arguments

$ARGUMENTS — the feature branch name to clean up (required)
