/**
 * Write the REST API's OpenAPI document to a file, without starting a server.
 *
 *   pnpm --filter @paperclipai/server exec tsx scripts/export-openapi.ts [out.json]
 *
 * Defaults to packages/sdk/openapi.json, which the SDK types are generated from.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenApiSpec } from "../src/routes/openapi.js";
import { PRODUCT_NAME } from "../src/app-brand.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? resolve(here, "../../packages/sdk/openapi.json"));
const spec = buildOpenApiSpec();
spec.info = { ...(spec.info ?? {}), title: `${PRODUCT_NAME} API` };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
const operations = Object.values(spec.paths ?? {}).reduce((n: number, item: any) => n + Object.keys(item).length, 0);
console.log(`Wrote ${out} (${Object.keys(spec.paths ?? {}).length} paths, ${operations} operations)`);
process.exit(0);
