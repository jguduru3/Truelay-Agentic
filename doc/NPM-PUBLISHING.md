# Publishing as npm packages, and using the API

This project publishes under its own npm name. By default that is:

| What | npm name | For |
| --- | --- | --- |
| The app | `autoorg` (command `autoorg`) | Installing and running the server, UI and API: `npx autoorg onboard` |
| Its parts | `@autoorg/server`, `@autoorg/shared`, `@autoorg/db`, adapters, plugins, ... | Installed automatically by `autoorg`; plugin authors use `@autoorg/plugin-sdk` |
| API client | `@autoorg/sdk` | Calling the REST API from your own code |

Any other name works: everything below takes `--scope` and `--cli`.

## How the renaming works

The source code keeps the upstream package names (`@paperclipai/*`,
`paperclipai`), so upstream updates still merge cleanly. Only the published
files change. `scripts/rescope-npm-packages.mjs` takes the package tarballs the
normal build produces and rewrites:

- package names and dependencies: `@paperclipai/x` → `@autoorg/x`,
  `paperclipai` → `autoorg`
- imports inside the compiled code, and bundled dependency folders
- the CLI command (`paperclipai` → `autoorg`) wherever the code names it;
  other commands get a branded alias (`paperclip-mcp-server` also installs as
  `autoorg-mcp-server`)
- descriptions and repository links (upstream links are removed)

It refuses to write a package if any old name is left in its manifest or
compiled code.

## Publish from GitHub Actions (recommended)

The server package contains a native runner binary and Linux/macOS-specific
dependencies, so it must be built on Linux or macOS, not native Windows.

1. On npmjs.com, create the `autoorg` organisation (for the `@autoorg` scope)
   and check that the unscoped name `autoorg` is free.
2. Create an npm **automation** token with publish rights and add it to the
   GitHub repository as the secret `NPM_TOKEN`.
3. In GitHub, open **Actions → Release rebranded npm packages → Run workflow**.
   Leave **publish** unticked the first time: the run builds everything,
   renames it, installs the renamed CLI as a smoke test and uploads the
   tarballs as the `rebranded-npm-packages` artifact for you to inspect.
4. Run it again with **publish** ticked. Dependencies are published first, the
   `autoorg` CLI last.

Bump the version (`version` in the package.json files) before each release;
npm refuses to publish a version twice.

The workflow builds the runner binary for Linux x64 only. The upstream release
also ships macOS and Linux arm64 runner binaries; features that use the native
runner will not work on those platforms until you add those builds.

## Build locally (Linux, macOS or WSL)

```sh
pnpm install
pnpm build
pnpm release:rebrand -- --scope @autoorg --cli autoorg --product "Automatic Organisation"
```

The renamed tarballs land in `release-npm/packages/` (the originals in
`release-npm/upstream/`). Add `--publish` (after `npm login`) to publish them,
or `--only <package name>` to handle just some packages.

On native Windows everything except `@paperclipai/server`, `@paperclipai/ui`
and the CLI can be built and packed; for those, use WSL or the workflow.

## Using the API

The server exposes its REST API under `/api`. The OpenAPI document is served
at `GET /api/openapi.json` on every instance; the reference pages are in
`docs/api/`.

Authenticate with `Authorization: Bearer <key>`:

- a **board API key** (created in the app) for full access to your companies,
- an **agent API key** (`POST /api/agents/{agentId}/keys`) scoped to one agent,
- or the run JWT an agent receives during a run.

### From JavaScript / TypeScript

```ts
import { createClient } from "@autoorg/sdk";

const api = createClient({ baseUrl: "https://ops.example.com", apiKey: process.env.AUTOORG_API_KEY });
const companies = await api.get("/api/companies");
```

Routes, parameters and bodies are typed from the OpenAPI document; see
`packages/sdk/README.md`. Works from ESM and CommonJS, in Node 18+ and browsers.

### Updating the SDK after API changes

```sh
pnpm sdk:generate   # re-export the OpenAPI document and regenerate the types
```

### From other languages

Point any OpenAPI generator at `/api/openapi.json` on your instance, or at the
copy shipped in the SDK package (`@autoorg/sdk/openapi.json`).
