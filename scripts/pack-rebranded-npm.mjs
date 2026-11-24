#!/usr/bin/env node
/**
 * pack-rebranded-npm.mjs
 *
 * Pack every public workspace package the way scripts/release.sh does, then
 * rename them for publishing under your own npm name (see
 * scripts/rescope-npm-packages.mjs). Run after `pnpm build`.
 *
 *   node scripts/pack-rebranded-npm.mjs [--scope @autoorg] [--cli autoorg] \
 *     [--product "Automatic Organisation"] [--repository <git url>] \
 *     [--out release-npm] [--only <package name>]... [--publish] [--tag latest]
 *
 * Output: <out>/upstream/*.tgz (as built) and <out>/packages/*.tgz (renamed).
 * Nothing is published unless --publish is given.
 *
 * The CLI package needs a bash shell (it runs scripts/build-npm.sh). Packages
 * that bundle native dependencies are prepared for Linux and macOS, so do
 * real releases on Linux or macOS (CI or WSL), not native Windows.
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { main as rescope, runCommand } from "./rescope-npm-packages.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PACKAGE_ROOTS = ["packages", "server", "ui", "cli"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

function parseArgs(argv) {
  const rescopeArgs = [];
  const only = new Set();
  let out = "release-npm";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") out = argv[++i];
    else if (arg === "--only") only.add(argv[++i]);
    else if (arg === "--publish") rescopeArgs.push(arg);
    else if (["--scope", "--cli", "--product", "--repository", "--tag"].includes(arg)) rescopeArgs.push(arg, argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { out: resolve(repoRoot, out), only, rescopeArgs };
}

/** Public (non-private) workspace packages, found the same way the release scripts do. */
export function discoverPublicPackages(root = repoRoot) {
  const found = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    const pkgPath = join(abs, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (!pkg.private) found.push({ dir: rel, name: pkg.name, pkg });
      return;
    }
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) walk(join(rel, entry.name));
    }
  };
  for (const rel of PACKAGE_ROOTS) walk(rel);
  return found;
}

/** Package scripts use POSIX shell syntax; on Windows run them through Git Bash when it is installed. */
function childEnv() {
  if (process.platform !== "win32" || process.env.npm_config_script_shell) return process.env;
  const candidates = [
    join(process.env.ProgramFiles ?? "C:/Program Files", "Git", "bin", "bash.exe"),
    join(process.env["ProgramFiles(x86)"] ?? "C:/Program Files (x86)", "Git", "bin", "bash.exe"),
  ];
  const bash = candidates.find((candidate) => existsSync(candidate));
  return bash ? { ...process.env, npm_config_script_shell: bash } : process.env;
}

function run(cmd, args, cwd) {
  runCommand(cmd, args, { cwd, stdio: "inherit", env: childEnv() });
}

/** prepack hooks swap in a publish-only package.json; never leave a package in that state. */
function restoreDevManifest(dir) {
  const devManifest = join(dir, "package.dev.json");
  if (existsSync(devManifest)) renameSync(devManifest, join(dir, "package.json"));
}

function packOne(entry, upstreamDir) {
  const dir = join(repoRoot, entry.dir);
  const bundled = entry.pkg.bundleDependencies ?? entry.pkg.bundledDependencies ?? [];
  if (bundled.length > 0) {
    const staging = mkdtempSync(join(tmpdir(), "pack-bundled-"));
    try {
      run(process.execPath, [join(repoRoot, "scripts", "prepare-bundled-package.mjs"), dir, staging], repoRoot);
      run("npm", ["pack", "--ignore-scripts", "--pack-destination", upstreamDir], staging);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
    return;
  }
  // Run the pack lifecycle hooks as explicit `pnpm run` steps: unlike hooks run
  // by `pnpm pack` itself, they honour script-shell, so they also work on Windows.
  const scripts = entry.pkg.scripts ?? {};
  try {
    if (scripts.prepack) run("pnpm", ["run", "prepack"], dir);
    run("pnpm", ["pack", "--config.ignore-scripts=true", "--pack-destination", upstreamDir], dir);
  } finally {
    // prepack swapped in a publish package.json without scripts; put the
    // original back first so postpack (which exists only there) can run.
    restoreDevManifest(dir);
    if (scripts.postpack) run("pnpm", ["run", "postpack"], dir);
  }
}

function packCli(upstreamDir) {
  const cliDir = join(repoRoot, "cli");
  run("bash", [join(repoRoot, "scripts", "build-npm.sh"), "--skip-checks", "--skip-typecheck"], repoRoot);
  try {
    run("npm", ["pack", "--ignore-scripts", "--pack-destination", upstreamDir], cliDir);
  } finally {
    // build-npm.sh swaps in a publish-only package.json; put the dev one back.
    restoreDevManifest(cliDir);
  }
}

const SKILL_BUNDLING_DIRS = ["server", "packages/adapters/claude-local", "packages/adapters/codex-local"];

/**
 * The same preparation scripts/release.sh does between `pnpm build` and
 * packing: standalone package builds, the UI copied into the server package,
 * and the runtime skills copied into the packages that ship them.
 */
function prepareReleaseArtifacts(entries) {
  const dirs = new Set(entries.map((entry) => entry.dir.split("\\").join("/")));
  run(process.execPath, [join(repoRoot, "scripts", "build-standalone-public-packages.mjs")], repoRoot);
  if (dirs.has("server")) run("bash", [join(repoRoot, "scripts", "prepare-server-ui-dist.sh")], repoRoot);
  for (const dir of SKILL_BUNDLING_DIRS) {
    if (!dirs.has(dir)) continue;
    const target = join(repoRoot, dir, "skills");
    rmSync(target, { recursive: true, force: true });
    cpSync(join(repoRoot, "skills"), target, { recursive: true });
  }
}

function main() {
  const { out, only, rescopeArgs } = parseArgs(process.argv.slice(2));
  const upstreamDir = join(out, "upstream");
  const packagesDir = join(out, "packages");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(upstreamDir, { recursive: true });
  // Reuse the UI build already in ui/dist instead of rebuilding it per package.
  process.env.PAPERCLIP_RELEASE_REUSE_UI_DIST = "1";

  const entries = discoverPublicPackages().filter((entry) => only.size === 0 || only.has(entry.name));
  if (entries.length === 0) throw new Error("No matching public packages");
  prepareReleaseArtifacts(entries);
  for (const entry of entries) {
    console.log(`\n==> Packing ${entry.name} (${relative(repoRoot, join(repoRoot, entry.dir))})`);
    if (entry.dir === "cli") packCli(upstreamDir);
    else packOne(entry, upstreamDir);
  }

  console.log("\n==> Renaming packages");
  rescope(["--in", upstreamDir, "--out", packagesDir, ...rescopeArgs]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
