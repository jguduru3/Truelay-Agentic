/**
 * The product brand shown to people using this instance.
 *
 * Nothing here is hard-coded to one organisation. The values come from, in
 * order:
 *
 *   1. `<meta name="app-brand-*">` tags the server writes into index.html from
 *      its APP_* environment variables (see server/src/app-brand.ts). This is
 *      the normal way to rebrand: set the variables and restart, no rebuild.
 *   2. VITE_APP_* variables baked in at build time, for a UI served without
 *      this server.
 *   3. The neutral defaults below.
 *
 * Package names, the CLI, internal environment variables and API paths are
 * not part of the brand and do not change.
 */

const DEFAULT_PRODUCT_NAME = "Automatic Organisation";
const DEFAULT_BRAND_NAME = "AutoOrg";
const DEFAULT_DESCRIPTION = "AI agents, tasks and approvals for your organisation";

function readMeta(name: string): string | null {
  if (typeof document === "undefined") return null;
  const content = document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim();
  return content ? content : null;
}

function readBuildEnv(name: string): string | null {
  // Written as plain `import.meta.env` so Vite can replace it at build time.
  const env = import.meta.env as Record<string, unknown> | undefined;
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolve(metaName: string, envName: string): string | null {
  return readMeta(metaName) ?? readBuildEnv(envName);
}

/** Full product name, e.g. in the tab title, sign-in heading and messages. */
export const PRODUCT_NAME =
  resolve("app-brand-product-name", "VITE_APP_PRODUCT_NAME")
  ?? resolve("app-brand-name", "VITE_APP_BRAND_NAME")
  ?? DEFAULT_PRODUCT_NAME;

/** Short name for tight spaces. */
export const BRAND_NAME =
  resolve("app-brand-name", "VITE_APP_BRAND_NAME")
  ?? (PRODUCT_NAME === DEFAULT_PRODUCT_NAME ? DEFAULT_BRAND_NAME : PRODUCT_NAME);

export const BRAND_DESCRIPTION = resolve("app-brand-description", "VITE_APP_DESCRIPTION") ?? DEFAULT_DESCRIPTION;

/** Logo image URL, or null to show the product name as text. */
export const BRAND_LOGO_SRC: string | null = resolve("app-brand-logo-url", "VITE_APP_LOGO_URL");

/** Square icon URL (favicon), or null for the bundled default icons. */
export const BRAND_ICON_SRC: string | null = resolve("app-brand-icon-url", "VITE_APP_ICON_URL");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex source matching the product name at the start of a server notice.
 * Notices written before the instance was rebranded used the upstream name,
 * so that spelling is still accepted.
 */
export const PRODUCT_NAME_PATTERN = `(?:${escapeRegExp(PRODUCT_NAME)}|Paperclip)`;

/**
 * Outbound links. Each is optional: when one is not configured the link is
 * not shown. Set them with APP_DOCS_URL, APP_FEEDBACK_URL, APP_PRIVACY_URL,
 * APP_TERMS_URL, APP_WEBSITE_URL and APP_SOURCE_URL on the server.
 */
function readUrl(metaName: string, envName: string): string | null {
  const value = resolve(metaName, envName);
  if (!value) return null;
  try {
    const url = new URL(value, "https://placeholder.invalid");
    return url.protocol === "https:" || url.protocol === "http:" ? value.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

export const BRAND_DOCS_URL = readUrl("app-brand-docs-url", "VITE_APP_DOCS_URL");
export const BRAND_FEEDBACK_URL = readUrl("app-brand-feedback-url", "VITE_APP_FEEDBACK_URL");
export const BRAND_PRIVACY_URL = readUrl("app-brand-privacy-url", "VITE_APP_PRIVACY_URL");
export const BRAND_TERMS_URL = readUrl("app-brand-terms-url", "VITE_APP_TERMS_URL");
export const BRAND_WEBSITE_URL = readUrl("app-brand-website-url", "VITE_APP_WEBSITE_URL");
/** Source repository (e.g. a GitHub URL) for commit links. */
export const BRAND_SOURCE_URL = readUrl("app-brand-source-url", "VITE_APP_SOURCE_URL");

/** A page under the documentation site, or null when no docs site is configured. */
export function brandDocsLink(path: string): string | null {
  return BRAND_DOCS_URL ? `${BRAND_DOCS_URL}/${path.replace(/^\/+/, "")}` : null;
}
