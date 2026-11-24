/**
 * Product name for text built in shared code (labels, guidance, catalogs).
 *
 * In the browser it comes from the `<meta name="app-brand-product-name">` tag
 * the server writes into index.html; on the server from APP_PRODUCT_NAME (or
 * APP_BRAND_NAME). See server/src/app-brand.ts for all branding settings.
 */
const DEFAULT_PRODUCT_NAME = "Automatic Organisation";

type MetaLookup = {
  querySelector(selector: string): { getAttribute(name: string): string | null } | null;
};

function fromDocument(): string | null {
  // Typed loosely so this file also compiles in Node-only projects without the DOM lib.
  const doc = (globalThis as { document?: MetaLookup }).document;
  const content = doc?.querySelector('meta[name="app-brand-product-name"]')?.getAttribute("content")?.trim();
  return content ? content : null;
}

function fromEnv(): string | null {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = env?.APP_PRODUCT_NAME?.trim() || env?.APP_BRAND_NAME?.trim();
  return value ? value : null;
}

export const PRODUCT_NAME: string = fromDocument() ?? fromEnv() ?? DEFAULT_PRODUCT_NAME;
