---
description: Open a PR that merges this repo's main down into OrlandoHealthMarTech/skynest
argument-hint: "[base-branch=develop] [--dry-run]"
---

Sync `main` of this repo (jhsdigitalconsulting/skynest) down to the downstream
repo `OrlandoHealthMarTech/skynest` by opening a PR there. Arguments: `$ARGUMENTS`
(base branch defaults to `develop`; `--dry-run` stops after step 3 and reports).

The downstream is a private, non-fork repo with its own commits, so this is a
merge (`--no-ff`), the same shape as the earlier "Merge upstream skynest main"
commits. Never force-push, never merge the PR, never touch this repo's branches.

## Steps

1. **Preflight.** `gh auth status` must show `jhs129` active; if not, run
   `gh auth switch --user jhs129`. Fetch `origin` here and confirm
   `origin/main` is what you intend to sync (report its SHA and subject).

2. **Throwaway clone.** Work in a fresh directory under the scratchpad, never
   in this working tree:
   `git clone https://github.com/OrlandoHealthMarTech/skynest <scratch>/oh-skynest`
   then `git remote add src https://github.com/jhsdigitalconsulting/skynest && git fetch src main`
   and `git checkout -B sync/upstream-<short-sha-of-src/main> origin/<base>`.
   If that branch already exists on the downstream, or an open sync PR already
   covers this SHA (`gh pr list --repo OrlandoHealthMarTech/skynest --state open`),
   stop and tell me instead of creating a duplicate.

3. **Work out what is new.** `git log --oneline origin/<base>..src/main`
   and list the source PR numbers and any ADO work item links found in those
   commit messages. If nothing is new, say the downstream is up to date and stop.

4. **Merge.** `git merge --no-ff src/main -m "Merge upstream skynest main: <one-line summary>"`
   with the attribution trailers from the session. On conflict, do NOT guess:
   list the conflicted files with the competing hunks and ask me how to resolve.
   Downstream-only changes (OH-specific config, env, fixes) must be preserved;
   check the downstream for an existing fix before overwriting anything.

5. **Verify** in the clone with pnpm only: `pnpm install`, then
   `pnpm test`, `pnpm lint`, `pnpm build`. Fix nothing silently: if one fails,
   report the real output and stop before pushing.

6. **Push and open the PR.** `git push -u origin HEAD`, then
   `gh pr create --repo OrlandoHealthMarTech/skynest --base <base> --head sync/upstream-<sha>`.
   The body opens with a short friendly first-person intro as if John wrote it,
   then: what is being brought down (each source PR as a link to
   jhsdigitalconsulting/skynest, plus ADO work item links), the full
   `git diff --stat origin/<base>...HEAD` summary (read the whole diff, don't
   write from memory), the test/lint/build results, and any downstream-specific
   notes. End with the PR attribution lines from the session.

7. **Report** the PR URL and what passed. Do not merge it and do not deploy;
   ask me for the go.
