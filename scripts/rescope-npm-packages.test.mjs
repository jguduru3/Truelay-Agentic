import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main, parseArgs, rewriteManifest, rewriteText, runCommand } from "./rescope-npm-packages.mjs";

const options = { scope: "@autoorg", cli: "autoorg", product: "Automatic Organisation", repository: null };

test("rewrites scoped imports and the CLI command but not URLs or longer names", () => {
  const source = [
    'import { x } from "@paperclipai/shared";',
    'const server = await import("@paperclipai/server");',
    "Run `paperclipai onboard` or npx paperclipai run.",
    "See https://github.com/paperclipai/paperclip and paperclipai-runner and PAPERCLIP_HOME.",
  ].join("\n");
  assert.equal(rewriteText(source, options), [
    'import { x } from "@autoorg/shared";',
    'const server = await import("@autoorg/server");',
    "Run `autoorg onboard` or npx autoorg run.",
    "See https://github.com/paperclipai/paperclip and paperclipai-runner and PAPERCLIP_HOME.",
  ].join("\n"));
});

test("renames the package, its dependencies and the bin command", () => {
  const manifest = rewriteManifest({
    name: "paperclipai",
    version: "1.2.3",
    description: "Paperclip CLI",
    keywords: ["paperclip", "ai"],
    bin: { paperclipai: "./dist/index.js" },
    homepage: "https://github.com/paperclipai/paperclip",
    repository: { type: "git", url: "https://github.com/paperclipai/paperclip", directory: "cli" },
    dependencies: { "@paperclipai/server": "1.2.3", zod: "^3.0.0" },
  }, { ...options, repository: "https://github.com/acme/ops" });
  assert.equal(manifest.name, "autoorg");
  assert.deepEqual(manifest.bin, { autoorg: "./dist/index.js" });
  assert.deepEqual(manifest.dependencies, { "@autoorg/server": "1.2.3", zod: "^3.0.0" });
  assert.deepEqual(manifest.keywords, ["ai"]);
  assert.equal(manifest.homepage, undefined);
  assert.deepEqual(manifest.repository, { type: "git", url: "https://github.com/acme/ops", directory: "cli" });
  assert.match(manifest.description, /^Automatic Organisation CLI/);
});

test("rewrites old names in free-text manifest fields too", () => {
  const manifest = rewriteManifest({
    name: "@paperclipai/adapter-hermes-gateway",
    version: "1.0.0",
    description: "Deprecated shim; use @paperclipai/hermes-paperclip-adapter/gateway",
    paperclip: { plugin: "@paperclipai/plugin-sdk" },
  }, options);
  assert.equal(manifest.description, "Deprecated shim; use @autoorg/hermes-paperclip-adapter/gateway");
  assert.deepEqual(manifest.paperclip, { plugin: "@autoorg/plugin-sdk" });
});

test("adds branded names for other upstream-named commands and keeps the old ones", () => {
  const manifest = rewriteManifest({ name: "@paperclipai/mcp-server", version: "1.0.0", bin: { "paperclip-mcp-server": "./dist/stdio.js" } }, options);
  assert.deepEqual(manifest.bin, { "paperclip-mcp-server": "./dist/stdio.js", "autoorg-mcp-server": "./dist/stdio.js" });
});

test("validates scope and CLI names", () => {
  assert.throws(() => parseArgs(["--in", "a", "--out", "b", "--scope", "autoorg"]), /--scope must look like @name/);
  assert.throws(() => parseArgs(["--in", "a", "--out", "b", "--cli", "Auto Org"]), /--cli must be/);
  assert.throws(() => parseArgs(["--scope", "@x"]), /--in and --out are required/);
});

test("round-trips a packed tarball, including bundled scoped dependencies", () => {
  const root = mkdtempSync(join(tmpdir(), "rescope-test-"));
  try {
    const pkgDir = join(root, "src");
    mkdirSync(join(pkgDir, "dist"), { recursive: true });
    mkdirSync(join(pkgDir, "node_modules", "@paperclipai", "shared"), { recursive: true });
    writeFileSync(join(pkgDir, "package.json"), JSON.stringify({
      name: "@paperclipai/server",
      version: "0.0.1",
      main: "dist/index.js",
      dependencies: { "@paperclipai/shared": "0.0.1" },
      bundleDependencies: ["@paperclipai/shared"],
    }));
    writeFileSync(join(pkgDir, "dist", "index.js"), 'export * from "@paperclipai/shared";\n');
    writeFileSync(join(pkgDir, "node_modules", "@paperclipai", "shared", "package.json"), JSON.stringify({ name: "@paperclipai/shared", version: "0.0.1" }));
    writeFileSync(join(pkgDir, "node_modules", "@paperclipai", "shared", "index.js"), "export const ok = true;\n");

    const inDir = join(root, "in");
    const outDir = join(root, "out");
    mkdirSync(inDir);
    runCommand("npm", ["pack", "--ignore-scripts", "--pack-destination", inDir], { cwd: pkgDir, stdio: "ignore" });

    const log = console.log;
    console.log = () => {};
    let results;
    try {
      results = main(["--in", inDir, "--out", outDir]);
    } finally {
      console.log = log;
    }
    assert.equal(results.length, 1);
    assert.equal(results[0].to, "@autoorg/server");

    const check = join(root, "check");
    mkdirSync(check);
    copyFileSync(results[0].file, join(check, "out.tgz"));
    runCommand("tar", ["-xzf", "out.tgz"], { cwd: check });
    const manifest = JSON.parse(readFileSync(join(check, "package", "package.json"), "utf8"));
    assert.equal(manifest.name, "@autoorg/server");
    assert.deepEqual(manifest.dependencies, { "@autoorg/shared": "0.0.1" });
    assert.deepEqual(manifest.bundleDependencies, ["@autoorg/shared"]);
    assert.equal(readFileSync(join(check, "package", "dist", "index.js"), "utf8"), 'export * from "@autoorg/shared";\n');
    assert.deepEqual(readdirSync(join(check, "package", "node_modules")), ["@autoorg"]);
    const bundled = JSON.parse(readFileSync(join(check, "package", "node_modules", "@autoorg", "shared", "package.json"), "utf8"));
    assert.equal(bundled.name, "@autoorg/shared");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
