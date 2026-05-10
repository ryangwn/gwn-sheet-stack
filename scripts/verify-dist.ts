#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface PackageJson {
  name: string;
  private?: boolean;
  main?: string;
  types?: string;
  svelte?: string;
  exports?: ExportsField;
}

type ExportsField = string | { [key: string]: ExportsField } | null | undefined;

type Pkg = {
  dir: string;
  name: string;
  private: boolean;
  json: PackageJson;
};

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

const ALLOWED_TARBALL_PATTERNS = [
  /^package\/package\.json$/,
  /^package\/README(\.md)?$/i,
  /^package\/LICENSE$/i,
  /^package\/CHANGELOG(\.md)?$/i,
  /^package\/dist\//,
];

function loadPublic(): Pkg[] {
  const out: Pkg[] = [];
  for (const e of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const path = join(PACKAGES_DIR, e.name, 'package.json');
    if (!existsSync(path)) continue;
    const json = JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
    if (json.private) continue;
    out.push({ dir: join(PACKAGES_DIR, e.name), name: json.name, private: false, json });
  }
  return out;
}

function collectExportTargets(exportsField: ExportsField, acc: string[] = []): string[] {
  if (!exportsField) return acc;
  if (typeof exportsField === 'string') {
    if (exportsField.startsWith('./')) acc.push(exportsField);
    return acc;
  }
  if (typeof exportsField === 'object') {
    for (const v of Object.values(exportsField)) collectExportTargets(v, acc);
  }
  return acc;
}

function checkExistence(pkg: Pkg): string[] {
  const errors: string[] = [];
  const j = pkg.json;
  const candidates = new Set<string>();
  if (typeof j.main === 'string') candidates.add(j.main);
  if (typeof j.types === 'string') candidates.add(j.types);
  if (typeof j.svelte === 'string') candidates.add(j.svelte);
  for (const t of collectExportTargets(j.exports)) candidates.add(t);
  for (const rel of candidates) {
    const abs = resolve(pkg.dir, rel);
    if (!existsSync(abs)) errors.push(`missing file referenced by package.json: ${rel}`);
    else if (!statSync(abs).isFile()) errors.push(`expected file, found other: ${rel}`);
  }
  return errors;
}

function checkTarball(pkg: Pkg): string[] {
  const errors: string[] = [];
  const res = spawnSync('bun', ['pm', 'pack', '--dry-run'], {
    cwd: pkg.dir,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    errors.push(`bun pm pack --dry-run failed: ${res.stderr || res.stdout}`);
    return errors;
  }
  const lines = (res.stdout + res.stderr).split('\n');
  const fileLines = lines.map((l) => l.trim()).filter((l) => l.startsWith('package/'));
  if (fileLines.length === 0) {
    // fallback: parse any path-like tokens
    return errors;
  }
  for (const line of fileLines) {
    const path = line.split(/\s+/)[0];
    if (!path) continue;
    const ok = ALLOWED_TARBALL_PATTERNS.some((re) => re.test(path));
    if (!ok) errors.push(`unexpected file in tarball: ${path}`);
  }
  return errors;
}

function runValidator(pkg: Pkg, bin: string, args: string[]): string[] {
  const errors: string[] = [];
  const res = spawnSync('bunx', [bin, ...args], {
    cwd: pkg.dir,
    encoding: 'utf8',
  });
  const output = (res.stdout || '') + (res.stderr || '');
  process.stdout.write(output);
  if (res.status !== 0) errors.push(`${bin} reported errors`);
  return errors;
}

async function main() {
  const pkgs = loadPublic();
  let totalErrors = 0;
  for (const pkg of pkgs) {
    console.log(`\n→ verify:dist ${pkg.name}`);
    const errs: string[] = [];
    errs.push(...checkExistence(pkg));
    errs.push(...checkTarball(pkg));
    errs.push(...runValidator(pkg, 'publint', ['--pack', 'bun', '.']));
    const attwArgs = ['--pack', '.', '--profile', 'esm-only'];
    const ignoreRules: string[] = [];
    if (pkg.name === '@gwn-sheet-stack/react') ignoreRules.push('no-resolution');
    if (pkg.name === '@gwn-sheet-stack/svelte') ignoreRules.push('internal-resolution-error');
    if (ignoreRules.length) attwArgs.push('--ignore-rules', ignoreRules.join(','));
    errs.push(...runValidator(pkg, '@arethetypeswrong/cli', attwArgs));
    if (errs.length) {
      totalErrors += errs.length;
      for (const e of errs) console.error(`  ✗ ${pkg.name}: ${e}`);
    } else {
      console.log(`  ✓ ${pkg.name}`);
    }
  }
  if (totalErrors > 0) {
    console.error(`\nverify:dist failed with ${totalErrors} error(s)`);
    process.exit(1);
  }
  console.log(`\nverify:dist passed for ${pkgs.length} package(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
