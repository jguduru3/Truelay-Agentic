import type { HTMLAttributes } from "react";
import { BRAND_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

interface BrandLockupProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  decorative?: boolean;
  title?: string;
}

/**
 * The instance brand: the configured logo (APP_LOGO_URL) when one is set,
 * otherwise the product name as text.
 *
 * Size it with a height class (`h-6`); a logo keeps its own aspect ratio.
 */
export function BrandLockup({ decorative = false, title = PRODUCT_NAME, className, style, ...rest }: BrandLockupProps) {
  const classes = ["inline-flex items-center", className].filter(Boolean).join(" ");
  if (BRAND_LOGO_SRC) {
    return (
      <span {...rest} className={classes} style={style} aria-hidden={decorative ? true : undefined}>
        <img src={BRAND_LOGO_SRC} alt={decorative ? "" : title} className="h-full w-auto object-contain" />
      </span>
    );
  }
  return (
    <span
      {...rest}
      className={[classes, "text-lg font-semibold leading-none tracking-tight"].join(" ")}
      style={style}
      aria-hidden={decorative ? true : undefined}
    >
      {title}
    </span>
  );
}
