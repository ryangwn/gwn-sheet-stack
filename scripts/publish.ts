#!/usr/bin/env bun
/**
 * Publish all public workspace packages via `bun publish`.
 *
 * Unlike `changeset publish` (which delegates to `npm publish`),
 * `bun publish` correctly resolves `workspace:*` protocol strings
 * to the actual version from the dependency's package.json.
 *
 * Usage:
 *   bun scripts/publish.ts                     # publish @latest
 *   bun scripts/publish.ts --tag canary        # publish @canary
 *   bun scripts/publish.ts --no-git-checks     # skip git state validation
 *   bun scripts/publish.ts --dry-run           # preview without publishing
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
}

type Pkg = { dir: string; name: string; version: string };

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

function loadPublic(): Pkg[] {
  const out: Pkg[] = [];
  for (const e of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const path = join(PACKAGES_DIR, e.name, 'package.json');
    if (!existsSync(path)) continue;
    const json = JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
    if (json.private) continue;
    out.push({ dir: join(PACKAGES_DIR, e.name), name: json.name, version: json.version });
  }
  return out;
}

function parseArgs(argv: string[]): { tag?: string; noGitChecks: boolean; dryRun: boolean } {
  let tag: string | undefined;
  let noGitChecks = false;
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--tag' && argv[i + 1]) {
      tag = argv[++i];
    } else if (argv[i] === '--no-git-checks') {
      noGitChecks = true;
    } else if (argv[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { tag, noGitChecks, dryRun };
}

function main() {
  const { tag, noGitChecks, dryRun } = parseArgs(process.argv);
  const pkgs = loadPublic();

  if (pkgs.length === 0) {
    console.log('No public packages found.');
    return;
  }

  console.log(
    `\nPublishing ${pkgs.length} package(s)${tag ? ` with --tag ${tag}` : ''}${dryRun ? ' (dry-run)' : ''}:\n`,
  );

  const failed: string[] = [];

  for (const pkg of pkgs) {
    const args = ['publish', '--access', 'public'];
    if (tag) args.push('--tag', tag);
    if (noGitChecks) args.push('--no-git-checks');
    if (dryRun) args.push('--dry-run');

    console.log(`→ ${pkg.name}@${pkg.version}`);
    const res = spawnSync('bun', args, {
      cwd: pkg.dir,
      stdio: 'inherit',
      env: process.env,
    });

    if (res.status !== 0) {
      console.error(`  ✗ ${pkg.name} failed (exit ${res.status})`);
      failed.push(pkg.name);
    } else {
      console.log(`  ✓ ${pkg.name}@${pkg.version} published`);
    }
  }

  console.log('');
  if (failed.length > 0) {
    console.error(`Failed to publish: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log(`Successfully published ${pkgs.length} package(s).`);
}

main();
