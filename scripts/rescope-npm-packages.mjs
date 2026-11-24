#!/usr/bin/env node
/**
 * rescope-npm-packages.mjs
 *
 * Publish this project under your own npm name. Takes the package tarballs the
 * normal release build produces (npm/pnpm pack output) and writes copies where
 *
 *   @paperclipai/<name>  ->  <scope>/<name>      (package names, dependencies, imports)
 *   paperclipai          ->  <cli>               (CLI package name, its bin command,
 *                                                 and the command named in help text)
 *
 * Source code keeps the upstream names, so pulling upstream changes stays easy;
 * only the published artifacts change.
 *
 * Usage:
 *   node scripts/rescope-npm-packages.mjs --in <dir-with-tgz> --out <dir> \
 *     [--scope @autoorg] [--cli autoorg] [--product "Automatic Organisation"] \
 *     [--repository https://github.com/you/repo] [--publish] [--tag latest]
 *
 * --publish runs `npm publish` for every rewritten tarball (you must be logged
 * in to npm with rights to the scope). Without it, nothing leaves this machine.
 */

import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FROM_SCOPE = "@paperclipai";
const FROM_CLI = "paperclipai";
const TEXT_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".json", ".map", ".md", ".txt", ".yaml", ".yml"]);

export function parseArgs(argv) {
  const options = {
    scope: "@autoorg",
    cli: "autoorg",
    product: null,
    repository: null,
    in: null,
    out: null,
    publish: false,
    tag: "latest",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      i += 1;
      return value;
    };
    if (arg === "--scope") options.scope = next();
    else if (arg === "--cli") options.cli = next();
    else if (arg === "--product") options.product = next();
    else if (arg === "--repository") options.repository = next();
    else if (arg === "--in") options.in = next();
    else if (arg === "--out") options.out = next();
    else if (arg === "--tag") options.tag = next();
    else if (arg === "--publish") options.publish = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.in || !options.out) throw new Error("--in and --out are required");
  if (!/^@[a-z0-9][a-z0-9._-]*$/.test(options.scope)) throw new Error(`--scope must look like @name, got ${options.scope}`);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(options.cli)) throw new Error(`--cli must be a valid unscoped npm name, got ${options.cli}`);
  return options;
}

export function renamePackage(name, options) {
  if (name === FROM_CLI) return options.cli;
  if (name.startsWith(`${FROM_SCOPE}/`)) return `${options.scope}/${name.slice(FROM_SCOPE.length + 1)}`;
  return name;
}

/** Rewrite one text file's contents. */
export function rewriteText(text, options, { isCliPackage = false } = {}) {
  let out = text.split(`${FROM_SCOPE}/`).join(`${options.scope}/`);
  // The bare CLI name: package name and the command people/agents run.
  // Leave it alone inside URLs, paths and longer identifiers
  // (github.com/paperclipai/..., paperclipai-foo, foo.paperclipai).
  out = out.replace(/(?<![\w/.@-])paperclipai(?![\w/.-])/g, options.cli);
  if (isCliPackage && options.product) {
    out = out.replace(/\bPaperclip CLI\b/g, `${options.product} CLI`);
  }
  return out;
}

export function rewriteManifest(pkg, options) {
  const out = { ...pkg, name: renamePackage(pkg.name, options) };
  for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "peerDependenciesMeta"]) {
    if (!out[section]) continue;
    out[section] = Object.fromEntries(Object.entries(out[section]).map(([name, spec]) => [renamePackage(name, options), spec]));
  }
  for (const key of ["bundleDependencies", "bundledDependencies"]) {
    if (Array.isArray(out[key])) out[key] = out[key].map((name) => renamePackage(name, options));
  }
  if (out.bin && typeof out.bin === "object" && out.bin[FROM_CLI]) {
    const { [FROM_CLI]: entry, ...rest } = out.bin;
    out.bin = { [options.cli]: entry, ...rest };
  }
  // Other commands named after upstream (paperclip-mcp-server, ...) get a
  // branded name too. The old name stays as an alias because generated
  // configs and docs refer to it.
  if (out.bin && typeof out.bin === "object") {
    for (const [command, entry] of Object.entries(out.bin)) {
      if (!/^paperclip-/.test(command)) continue;
      const branded = `${options.cli}-${command.slice("paperclip-".length)}`;
      if (!(branded in out.bin)) out.bin[branded] = entry;
    }
  }
  if (pkg.name === FROM_CLI && options.product) {
    out.description = `${options.product} CLI: run AI agent teams, tasks and approvals`;
  } else if (typeof out.description === "string" && options.product) {
    out.description = out.description.replace(/\bPaperclip\b/g, options.product);
  }
  if (Array.isArray(out.keywords)) out.keywords = out.keywords.filter((word) => !/paperclip/i.test(word));
  // Upstream links would point users at the wrong project.
  delete out.homepage;
  delete out.bugs;
  if (options.repository) {
    const directory = typeof pkg.repository === "object" ? pkg.repository.directory : undefined;
    out.repository = { type: "git", url: options.repository, ...(directory ? { directory } : {}) };
  } else {
    delete out.repository;
  }
  out.publishConfig = { ...(out.publishConfig ?? {}), access: "public" };
  // Catch the old names anywhere else in the manifest (descriptions, exports
  // maps, custom fields) the same way source files are rewritten.
  return JSON.parse(rewriteText(JSON.stringify(out), options));
}

function walkFiles(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, visit);
    else if (entry.isFile()) visit(full);
  }
}

/** Bundled dependencies live in node_modules/@paperclipai/<name>; move them to the new scope. */
function renameBundledScopeDirs(dir, options) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name === "node_modules") {
      const oldScopeDir = join(full, FROM_SCOPE);
      if (existsSync(oldScopeDir)) {
        const newScopeDir = join(full, options.scope);
        mkdirSync(newScopeDir, { recursive: true });
        for (const child of readdirSync(oldScopeDir)) renameSync(join(oldScopeDir, child), join(newScopeDir, child));
        rmSync(oldScopeDir, { recursive: true, force: true });
      }
      const oldCliDir = join(full, FROM_CLI);
      if (existsSync(oldCliDir)) renameSync(oldCliDir, join(full, options.cli));
    }
    renameBundledScopeDirs(full, options);
  }
}

/** Every reference to the old names that survived, for the final check. */
export function findLeftovers(packageDir) {
  const leftovers = [];
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  if (manifest.name === FROM_CLI || manifest.name.startsWith(`${FROM_SCOPE}/`)) leftovers.push(`name ${manifest.name}`);
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (name === FROM_CLI || name.startsWith(`${FROM_SCOPE}/`)) leftovers.push(`${section} ${name}`);
    }
  }
  walkFiles(packageDir, (file) => {
    if (!TEXT_EXTENSIONS.has(extname(file))) return;
    if (readFileSync(file, "utf8").includes(`${FROM_SCOPE}/`)) leftovers.push(`import in ${file.slice(packageDir.length + 1)}`);
  });
  return leftovers;
}

/**
 * Run a command. Windows needs a shell to start npm/pnpm (.cmd shims), so there
 * the command line is quoted here instead of passing an argument list to a shell.
 */
export function runCommand(cmd, args, options = {}) {
  if (process.platform !== "win32") return execFileSync(cmd, args, options);
  const quote = (value) => (/^[\w@%+=:,./\-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`);
  return execSync([cmd, ...args].map(quote).join(" "), options);
}

function run(cmd, args, cwd) {
  return runCommand(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}

export function rescopeTarball(tarball, options, outDir) {
  const work = mkdtempSync(join(tmpdir(), "rescope-"));
  try {
    // Relative paths only: GNU tar reads "C:" in a Windows path as a remote host.
    copyFileSync(tarball, join(work, "input.tgz"));
    run("tar", ["-xzf", "input.tgz"], work);
    rmSync(join(work, "input.tgz"));
    const packageDir = join(work, "package");
    const original = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    const isCliPackage = original.name === FROM_CLI;
    walkFiles(packageDir, (file) => {
      if (!TEXT_EXTENSIONS.has(extname(file)) || file.endsWith(`${join("package", "package.json")}`)) return;
      if (statSync(file).size > 64 * 1024 * 1024) return;
      const text = readFileSync(file, "utf8");
      const next = rewriteText(text, options, { isCliPackage });
      if (next !== text) writeFileSync(file, next);
    });
    renameBundledScopeDirs(packageDir, options);
    const manifest = rewriteManifest(original, options);
    writeFileSync(join(packageDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const leftovers = findLeftovers(packageDir);
    if (leftovers.length > 0) {
      throw new Error(`${original.name}: old names remain after rewriting:\n  ${leftovers.slice(0, 20).join("\n  ")}`);
    }
    const packed = run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", outDir], packageDir);
    const [{ filename }] = JSON.parse(packed);
    return { from: original.name, to: manifest.name, version: manifest.version, file: join(outDir, filename) };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const inDir = resolve(options.in);
  const outDir = resolve(options.out);
  mkdirSync(outDir, { recursive: true });
  const tarballs = readdirSync(inDir).filter((name) => name.endsWith(".tgz")).map((name) => join(inDir, name));
  if (tarballs.length === 0) throw new Error(`No .tgz files in ${inDir}`);

  const results = tarballs.map((tarball) => rescopeTarball(tarball, options, outDir));
  for (const result of results) console.log(`${result.from} -> ${result.to}@${result.version}  ${result.file}`);

  if (options.publish) {
    // Dependencies first is not required by npm, but publishing the CLI last
    // means nobody can install it before what it needs exists.
    const ordered = [...results].sort((a, b) => Number(a.to === options.cli) - Number(b.to === options.cli));
    for (const result of ordered) {
      console.log(`Publishing ${result.to}@${result.version}...`);
      run("npm", ["publish", result.file, "--access", "public", "--tag", options.tag], outDir);
    }
  } else {
    console.log(`\n${results.length} package(s) written to ${outDir}. Nothing was published; add --publish to publish.`);
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
