# Custom Commands

Git workflow commands in `.claude/commands/`:

- **`/feature-cleanup <branch>`** — After a PR is merged, removes the worktree, deletes local/remote branches, and cleans stray files. Run `git fetch --prune` first.
- **`/squash-merge-sync <branch>`** — After a squash-merged PR, cherry-picks orphaned commits (added after PR was opened) onto main. Verifies build before pushing.
- **`/worktree-setup <branch>`** — Creates a git worktree for a feature branch at `../<branch>/` and installs dependencies. Pairs with `/feature-cleanup`.
- **`/post-merge-deploy <branch>`** — Full post-merge workflow: syncs main, runs `/feature-cleanup`, builds, and deploys to Vercel.
- **`/verify-build`** — Runs all three verification gates in sequence (`tsc --noEmit` → `pnpm build` → `pnpm test`), stopping on first failure.
