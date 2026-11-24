import { describe, expect, it } from "vitest";
import { DEFAULT_PRODUCT_NAME, getAppBrand, renderWebManifest } from "../app-brand.js";
import { applyUiBranding } from "../ui-branding.js";

const TEMPLATE = `<!doctype html>
<head>
    <meta name="theme-color" content="#18181b" />
    <meta name="apple-mobile-web-app-title" content="Default" />
    <title>Default</title>
    <!-- APP_RUNTIME_BRANDING_START -->
    <!-- APP_RUNTIME_BRANDING_END -->
    <!-- APP_FAVICON_START -->
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- APP_FAVICON_END -->
</head>`;

describe("instance branding", () => {
  it("uses neutral defaults when nothing is configured", () => {
    const brand = getAppBrand({});
    expect(brand.productName).toBe(DEFAULT_PRODUCT_NAME);
    expect(brand.logoUrl).toBeNull();
    expect(brand.iconUrl).toBeNull();
  });

  it("reads name, logo, icon and colours from APP_* variables", () => {
    const brand = getAppBrand({
      APP_PRODUCT_NAME: "Acme Operations",
      APP_BRAND_NAME: "Acme",
      APP_LOGO_URL: "/brand/acme.svg",
      APP_ICON_URL: "https://cdn.example.com/acme.png",
      APP_THEME_COLOR: "0af",
    });
    expect(brand).toMatchObject({
      productName: "Acme Operations",
      brandName: "Acme",
      logoUrl: "/brand/acme.svg",
      iconUrl: "https://cdn.example.com/acme.png",
      appIconUrl: "https://cdn.example.com/acme.png",
      themeColor: "#00aaff",
    });
  });

  it("publishes only the outbound links that are configured", () => {
    const html = applyUiBranding(TEMPLATE, { APP_DOCS_URL: "https://docs.example.com" });
    expect(html).toContain('<meta name="app-brand-docs-url" content="https://docs.example.com/" />');
    expect(html).not.toContain("app-brand-feedback-url");
  });

  it("rejects script and protocol-relative asset URLs", () => {
    const brand = getAppBrand({ APP_LOGO_URL: "javascript:alert(1)", APP_ICON_URL: "//evil.example/x.png" });
    expect(brand.logoUrl).toBeNull();
    expect(brand.iconUrl).toBeNull();
  });

  it("writes the brand into the page title, meta tags and favicon", () => {
    const html = applyUiBranding(TEMPLATE, {
      APP_PRODUCT_NAME: "Acme <Ops>",
      APP_ICON_URL: "/brand/acme.svg",
    });
    expect(html).toContain("<title>Acme &lt;Ops&gt;</title>");
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Acme &lt;Ops&gt;" />');
    expect(html).toContain('<meta name="app-brand-product-name" content="Acme &lt;Ops&gt;" />');
    expect(html).toContain('<link rel="icon" href="/brand/acme.svg" sizes="any" />');
    expect(html).not.toContain('href="/favicon.svg"');
  });

  it("serves a manifest with the configured name and icon", () => {
    const manifest = JSON.parse(renderWebManifest(getAppBrand({
      APP_PRODUCT_NAME: "Acme Operations",
      APP_APP_ICON_URL: "/brand/acme-512.png",
    })));
    expect(manifest.name).toBe("Acme Operations");
    expect(manifest.short_name).toBe("Acme Operations");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons[0]).toMatchObject({ src: "/brand/acme-512.png", type: "image/png" });
  });
});
