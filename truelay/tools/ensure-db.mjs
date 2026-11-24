// Creates the 'paperclip' database if it is missing. Used by run-local.ps1.
// Usage: node ensure-db.mjs <repo-root> <admin-connection-url>
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [repoRoot, adminUrl] = process.argv.slice(2);
if (!repoRoot || !adminUrl) {
  console.error("usage: node ensure-db.mjs <repo-root> <admin-connection-url>");
  process.exit(2);
}
// Resolve the postgres client from the db package, where it is installed.
const require = createRequire(pathToFileURL(join(repoRoot, "packages", "db", "package.json")));
const postgres = require("postgres");
const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
try {
  const rows = await sql`select 1 from pg_database where datname = 'paperclip'`;
  if (rows.length === 0) {
    await sql.unsafe("create database paperclip owner paperclip");
    console.log("Created database 'paperclip'.");
  }
} finally {
  await sql.end();
}
