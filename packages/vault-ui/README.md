# @promptowl/contextnest-vault-ui

A web UI for browsing, editing and reviewing a ContextNest vault. It is a Next.js (App Router) workspace package, shipped as TypeScript source, that a host app mounts under a route such as `/vault`.

The package knows nothing about its host's auth, storage or vault registry. The host passes all of that in through one interface, `VaultHost`.

## What you get

| Route (under the mount point) | Page |
| --- | --- |
| `/` | Vault picker / redirect to the default vault |
| `/[vaultId]` | Vault home |
| `/[vaultId]/doc/[...path]` | Read a document |
| `/[vaultId]/edit/[...path]`, `/new` | Visual and Markdown editor, create |
| `/[vaultId]/review`, `/review/[...path]` | Review queue and draft diff |
| `/[vaultId]/context`, `/settings` | `CONTEXT.md` editor, vault settings and Git sync |
| `/[vaultId]/assets`, `/assets/[file]` | Upload and serve images and video |

## Requirements

- Next.js >= 15 (App Router), React >= 19, Tailwind CSS v4 with `@tailwindcss/typography`
- `@promptowl/contextnest-engine` (a workspace dependency)
- pnpm workspaces

## Setup in a host app

### 1. Add the package

Put it in the workspace and depend on it.

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```jsonc
// package.json
"dependencies": { "@promptowl/contextnest-vault-ui": "workspace:*" }
```

### 2. Compile it with your app

The package ships TypeScript source.

```ts
// next.config.ts
const config: NextConfig = {
  transpilePackages: ['@promptowl/contextnest-vault-ui'],
};
```

### 3. Point `@vault-ui-host` at your host

The package imports your `VaultHost` implementation from the module alias `@vault-ui-host`. The module must export `vaultHost`. This is the only import the package makes into the host.

```jsonc
// tsconfig.json
"paths": { "@vault-ui-host": ["./src/lib/vault-host/index.ts"] }
```

Next.js reads the alias from `tsconfig.json`. For tests, add the same alias to your test runner (Skynest does this in `vitest.config.ts`).

### 4. Implement `VaultHost`

The full contract, with comments, is in [`src/lib/host.ts`](src/lib/host.ts). Skynest's implementation is [`src/lib/vault-host/index.ts`](../../src/lib/vault-host/index.ts) and is a good reference.

```ts
import type { VaultHost } from '@promptowl/contextnest-vault-ui/host';

export const vaultHost: VaultHost = {
  branding: { name: 'My App', homeHref: '/', logoSrc: '/logo.png' },
  vaults: { list, find, defaultId },          // which vaults exist
  setting: (key, vaultId) => process.env[key], // per-vault settings, see below
  identity,                                    // who is signed in, and can they write?
  createEngine,                                // storage + audit-trail sync for a user and vault
  SignInPrompt,                                // component shown to signed-out users
  gitSync,                                     // optional: omit to hide Git sync
};
```

| Member | You provide |
| --- | --- |
| `branding` | App name, the "back to the app" link, and logo URL shown in the header |
| `vaults` | `list()`, `find(id)` (null when unknown) and `defaultId()` |
| `setting(key, vaultId)` | The value for a per-vault setting, or `undefined` |
| `identity()` | `signed_out`, `no_access`, `error`, or `ok` with `access: 'read' \| 'write'`, the login and a `userToken` |
| `createEngine(userToken, vaultId)` | A `VaultEngine`: a `NestStorage`, a `VaultSyncProvider` and the token |
| `SignInPrompt` | A React component rendered when `identity()` is `signed_out` |
| `gitSync` | Optional `GitSyncHost`. When absent the UI hides Git sync |

### 5. Mount the routes

Mount each route from a file in your app that re-exports the package's. Next.js segment config such as `dynamic` can't be re-exported, so declare it in the mount file.

```ts
// src/app/vault/page.tsx
export { default } from '@promptowl/contextnest-vault-ui/routes/page';
export const dynamic = 'force-dynamic';
```

```ts
// src/app/vault/[vaultId]/layout.tsx
export { default } from '@promptowl/contextnest-vault-ui/routes/[vaultId]/layout';
export { generateMetadata } from '@promptowl/contextnest-vault-ui/routes/[vaultId]/layout';
```

```ts
// src/app/vault/[vaultId]/error.tsx
'use client';
export { default } from '@promptowl/contextnest-vault-ui/routes/[vaultId]/error';
```

Repeat for every route in the table above (`loading`, `not-found`, `page`, `doc`, `edit`, `new`, `review`, `context`, `settings`, `assets`). `error.tsx` and `not-found.tsx` must start with `'use client'`. Skynest's [`src/app/vault`](../../src/app/vault) has the complete set.

### 6. Load the styles

In your global CSS, after `@import "tailwindcss"`, import the package styles and tell Tailwind to scan its source:

```css
@import "tailwindcss";
@import "@promptowl/contextnest-vault-ui/styles.css";
@plugin "@tailwindcss/typography";
@source "../../packages/vault-ui/src";
```

Adjust the `@source` path to where your CSS file sits relative to `packages/vault-ui/src`.

## Per-vault settings

The UI reads these through `host.setting(key, vaultId)`:

| Key | Default | Effect |
| --- | --- | --- |
| `VAULT_UI_ROOT` | `nodes` | The folder in the vault that the UI treats as its content root |
| `CONTEXTNEST_NEST_ID` | the vault id | Nest id written into uploaded image and video links (`/nests/<id>/assets/<file>`) |

Skynest resolves a key per vault by looking up `<KEY>_<VAULT_ID>` (upper-cased, `-` becomes `_`) first and then `<KEY>`. For example `VAULT_UI_ROOT_DOCS` applies only to the `docs` vault.

The review workflow also reads host environment variables directly:

| Variable | Effect |
| --- | --- |
| `CONTEXTNEST_REQUIRE_REVIEW` | `true`: edits by non-reviewers become drafts in the review queue |
| `AUTHZ_REVIEWERS` | Comma-separated logins allowed to approve drafts |
| `AUTHZ_ENTRA_REVIEWER_GROUP_ID` | Entra group whose members are reviewers |

## Skynest's configuration

When hosted in Skynest, storage, auth and vault selection come from Skynest's environment variables (`CONTEXTNEST_STORAGE`, `CONTEXTNEST_BLOB_PREFIX`, `CONTEXTNEST_VAULTS`, `CONTEXTNEST_DEFAULT_VAULT_ID`, `AUTH_*`, `GITHUB_CLIENT_*`, `AUTHZ_*`, and others). See "Deploying Skynest" in the [root README](../../README.md).

## Development

```bash
pnpm test    # vitest, from the repo root, also covers this package
pnpm build   # the host app's build type-checks and bundles the package
```
