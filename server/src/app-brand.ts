/**
 * Instance branding: the product name, logo, icon and colours people see.
 *
 * Everything here is read from environment variables at request time, so one
 * build can be rebranded per deployment without rebuilding the UI:
 *
 *   APP_PRODUCT_NAME      Full product name ("Acme Operations").
 *   APP_BRAND_NAME        Short name for tight spaces and the home-screen label.
 *   APP_DESCRIPTION       One-line description for the web app manifest.
 *   APP_LOGO_URL          Logo shown on sign-in and other brand surfaces.
 *                         An absolute URL or a path served by this instance,
 *                         e.g. "/brand/logo.svg" for a file in ui/public/brand/.
 *   APP_ICON_URL          Square icon used for the browser tab (favicon).
 *   APP_APP_ICON_URL      Square PNG (512x512 recommended) for installed apps.
 *   APP_THEME_COLOR       Browser UI colour, hex (#18181b).
 *   APP_BACKGROUND_COLOR  Splash background for installed apps, hex.
 *   APP_DOCS_URL, APP_FEEDBACK_URL, APP_PRIVACY_URL, APP_TERMS_URL,
 *   APP_WEBSITE_URL, APP_SOURCE_URL
 *                         Optional outbound links. A link that is not set is
 *                         not shown in the UI.
 *
 * The server writes these into index.html as `<meta name="app-brand-*">` tags
 * (see ui-branding.ts) and serves a matching /site.webmanifest. The UI reads
 * the tags through ui/src/lib/brand.ts.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";
import { resolvePaperclipEnvPath } from "./paths.js";

export const DEFAULT_PRODUCT_NAME = "Automatic Organisation";
export const DEFAULT_BRAND_NAME = "AutoOrg";
export const DEFAULT_DESCRIPTION = "AI agents, tasks and approvals for your organisation";
export const DEFAULT_THEME_COLOR = "#18181b";

export type AppBrand = {
  productName: string;
  brandName: string;
  description: string;
  logoUrl: string | null;
  iconUrl: string | null;
  appIconUrl: string | null;
  themeColor: string;
  backgroundColor: string;
  links: {
    docs: string | null;
    feedback: string | null;
    privacy: string | null;
    terms: string | null;
    website: string | null;
    source: string | null;
  };
};

function nonEmpty(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHexColor(value: string | undefined): string | null {
  const raw = nonEmpty(value);
  if (!raw) return null;
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex.split("").map((char) => `${char}${char}`).join("").toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`;
  return null;
}

/** Accept only http(s) URLs and same-origin absolute paths, never javascript: or data: from config. */
function safeAssetUrl(value: string | undefined): string | null {
  const raw = nonEmpty(value);
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getAppBrand(env: NodeJS.ProcessEnv = process.env): AppBrand {
  const productName = nonEmpty(env.APP_PRODUCT_NAME) ?? nonEmpty(env.APP_BRAND_NAME) ?? DEFAULT_PRODUCT_NAME;
  const brandName = nonEmpty(env.APP_BRAND_NAME) ?? (nonEmpty(env.APP_PRODUCT_NAME) ? productName : DEFAULT_BRAND_NAME);
  const themeColor = normalizeHexColor(env.APP_THEME_COLOR) ?? DEFAULT_THEME_COLOR;
  return {
    productName,
    brandName,
    description: nonEmpty(env.APP_DESCRIPTION) ?? DEFAULT_DESCRIPTION,
    logoUrl: safeAssetUrl(env.APP_LOGO_URL),
    iconUrl: safeAssetUrl(env.APP_ICON_URL),
    appIconUrl: safeAssetUrl(env.APP_APP_ICON_URL) ?? safeAssetUrl(env.APP_ICON_URL),
    themeColor,
    backgroundColor: normalizeHexColor(env.APP_BACKGROUND_COLOR) ?? themeColor,
    links: {
      docs: safeAssetUrl(env.APP_DOCS_URL),
      feedback: safeAssetUrl(env.APP_FEEDBACK_URL),
      privacy: safeAssetUrl(env.APP_PRIVACY_URL),
      terms: safeAssetUrl(env.APP_TERMS_URL),
      website: safeAssetUrl(env.APP_WEBSITE_URL),
      source: safeAssetUrl(env.APP_SOURCE_URL),
    },
  };
}

function iconType(url: string): string | undefined {
  const pathname = url.split(/[?#]/)[0]!.toLowerCase();
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

export function renderWebManifest(brand: AppBrand = getAppBrand()): string {
  const icons = brand.appIconUrl
    ? [
      { src: brand.appIconUrl, sizes: "any", ...(iconType(brand.appIconUrl) ? { type: iconType(brand.appIconUrl) } : {}) },
      { src: brand.appIconUrl, sizes: "any", purpose: "maskable", ...(iconType(brand.appIconUrl) ? { type: iconType(brand.appIconUrl) } : {}) },
    ]
    : [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ];
  return JSON.stringify(
    {
      id: "/",
      name: brand.productName,
      short_name: brand.brandName,
      description: brand.description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      theme_color: brand.themeColor,
      background_color: brand.backgroundColor,
      icons,
    },
    null,
    2,
  );
}

/**
 * Server messages build their text when modules load, which can be before
 * config.ts reads the instance .env. Pull just the APP_* brand keys from the
 * same files first so those messages use the configured name. Values already
 * in the process environment win.
 */
function preloadBrandEnv(env: NodeJS.ProcessEnv): void {
  const candidates: string[] = [];
  try {
    candidates.push(resolvePaperclipEnvPath());
  } catch {
    // No resolvable instance config; fall back to the working directory only.
  }
  candidates.push(resolve(process.cwd(), ".env"));
  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue;
      const parsed = parseDotenv(readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (key.startsWith("APP_") && env[key] === undefined) env[key] = value;
      }
    } catch {
      // An unreadable env file is reported by config.ts; branding just keeps defaults.
    }
  }
}

preloadBrandEnv(process.env);

/** The configured product name, for server-generated messages. */
export const PRODUCT_NAME = getAppBrand().productName;
/** The configured short brand name. */
export const BRAND_NAME = getAppBrand().brandName;
