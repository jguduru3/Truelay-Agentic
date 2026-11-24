# Branding (white-label)

Every instance can show its own product name, logo, icons and colours. Nothing
in the UI or in server messages is tied to one brand: they all read the
settings below. Change them and restart the server; the UI does not need to be
rebuilt.

## Settings

Set these as environment variables (Docker/compose, systemd, or the instance
`.env` file).

| Variable | What it changes | Default |
| --- | --- | --- |
| `APP_PRODUCT_NAME` | Full name: browser tab, sign-in page, invites, every message that names the product (UI, server notices, agent guidance) | `Automatic Organisation` |
| `APP_BRAND_NAME` | Short name: home-screen label of the installed app | `AutoOrg` (or the product name, if that is set) |
| `APP_DESCRIPTION` | Description in the web app manifest | generic text |
| `APP_LOGO_URL` | Logo on the sign-in page. Without it, the product name is shown as text | none |
| `APP_ICON_URL` | Browser tab icon (favicon). SVG or PNG | bundled neutral icon |
| `APP_APP_ICON_URL` | Icon for the installed app (512×512 PNG recommended). Falls back to `APP_ICON_URL` | bundled neutral icon |
| `APP_THEME_COLOR` | Browser UI colour, hex | `#18181b` |
| `APP_BACKGROUND_COLOR` | Splash background of the installed app, hex | theme colour |
| `APP_DOCS_URL` | "Documentation" menu item and "learn how" links (paths are added under it, e.g. `/reference/deploy/https/`) | hidden |
| `APP_FEEDBACK_URL` | "Share feedback" button in the sidebar | hidden |
| `APP_PRIVACY_URL` | Privacy policy links (analytics banner, Google Workspace) | hidden |
| `APP_TERMS_URL` | Terms link next to feedback voting | hidden |
| `APP_WEBSITE_URL` | "Learn more" links and the link in exported company READMEs | hidden |
| `APP_SOURCE_URL` | Source repository: commit links and the "star us" prompt | hidden |

Logo and icon values are either `https://` URLs or paths served by this
instance. To serve your own files, put them in `ui/public/brand/` (they are
copied into the build) and use `/brand/<file>`, for example
`APP_LOGO_URL=/brand/acme-logo.svg`.

Example:

```env
APP_PRODUCT_NAME=Acme Operations
APP_BRAND_NAME=Acme
APP_LOGO_URL=/brand/acme-logo.svg
APP_ICON_URL=/brand/acme-icon.svg
APP_APP_ICON_URL=/brand/acme-icon-512.png
APP_THEME_COLOR=#0f172a
```

The Truelay deployment (`truelay/deploy/docker-compose.truelay.yml`) is a
working example: it sets these variables to the Truelay name and the files in
`ui/public/brand/truelay/`.

## UI served without this server

If the UI is built and hosted on its own, set the same values with a `VITE_`
prefix at build time (`VITE_APP_PRODUCT_NAME`, `VITE_APP_BRAND_NAME`,
`VITE_APP_DESCRIPTION`, `VITE_APP_LOGO_URL`, `VITE_APP_ICON_URL`), and replace
`ui/public/site.webmanifest` and the bundled icons in `ui/public/`.

## How it works

- `server/src/app-brand.ts` reads the settings and serves `/site.webmanifest`.
- `server/src/ui-branding.ts` writes the name into `<title>` and adds
  `<meta name="app-brand-*">` tags to `index.html` on every page load.
- `ui/src/lib/brand.ts` reads those tags (`PRODUCT_NAME`, `BRAND_NAME`,
  `BRAND_LOGO_SRC`, ...). UI text uses `PRODUCT_NAME` instead of a fixed name.
- Server messages use `PRODUCT_NAME` from `server/src/app-brand.ts`; shared
  code uses `packages/shared/src/brand.ts`.

Messages the server writes are stored with the name that was configured at the
time. Renaming later does not rewrite old messages.

## Tests

Tests do not use your deployment's settings. The vitest configs for `ui`,
`server`, `cli` and `packages/shared` set a fixed one-word test brand
(`APP_PRODUCT_NAME=Papyrus`) and example links (`VITE_APP_*_URL`), so test
results are the same everywhere. Expected text in tests uses `PRODUCT_NAME` or
the `BRAND_*` constants rather than a literal name.

## Known limits

- The chat slash command registered in Discord, Slack and Telegram is still
  `/paperclip`. The server also uses that name to recognise commands it
  registered earlier, so renaming it needs a migration for existing installs.
- The optional "Notebook connector" (off by default) connects to an external
  service that keeps its own name.
- Messages written for agents (prompts, skills) use the configured name, but
  the agent-facing CLI and API still use internal names such as
  `PAPERCLIP_API_KEY`.

## What is not part of the brand

Internal identifiers keep their upstream names in the source so upstream
updates, saved data, company imports and plugins keep working: workspace
package names (`@paperclipai/*`), `PAPERCLIP_*` settings, `X-Paperclip-*` HTTP
headers, database names, API paths and storage keys. People using the product
do not see these. Published npm packages and the CLI command are renamed at
publish time instead (see below).

## Publishing under your own name

To publish the app and its API client to npm under your own name, see
[NPM-PUBLISHING.md](NPM-PUBLISHING.md).
