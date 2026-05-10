#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type Pkg = {
  dir: string;
  name: string;
  private: boolean;
  scripts: Record<string, string>;
  workspaceDeps: Set<string>;
};

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadPackages(): Pkg[] {
  const entries = readdirSync(PACKAGES_DIR, { withFileTypes: true });
  const pkgs: Pkg[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const pkgPath = join(PACKAGES_DIR, e.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const json = readJson(pkgPath);
    const deps = new Set<string>();
    for (const field of ['dependencies', 'peerDependencies', 'devDependencies'] as const) {
      const block = json[field] ?? {};
      for (const [name, ver] of Object.entries<string>(block)) {
        if (typeof ver === 'string' && ver.startsWith('workspace:')) deps.add(name);
      }
    }
    pkgs.push({
      dir: join(PACKAGES_DIR, e.name),
      name: json.name,
      private: !!json.private,
      scripts: json.scripts ?? {},
      workspaceDeps: deps,
    });
  }
  return pkgs;
}

function topoLayers(pkgs: Pkg[]): Pkg[][] {
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const remaining = new Set(pkgs);
  const placed = new Set<string>();
  const layers: Pkg[][] = [];
  while (remaining.size > 0) {
    const layer: Pkg[] = [];
    for (const p of remaining) {
      const deps = [...p.workspaceDeps].filter((d) => byName.has(d));
      if (deps.every((d) => placed.has(d))) layer.push(p);
    }
    if (layer.length === 0) {
      const names = [...remaining].map((p) => p.name).join(', ');
      throw new Error(`Cycle or unresolved workspace deps among: ${names}`);
    }
    for (const p of layer) {
      placed.add(p.name);
      remaining.delete(p);
    }
    layers.push(layer);
  }
  return layers;
}

function runScript(pkg: Pkg, script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', '--cwd', pkg.dir, script], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${pkg.name} ${script} exited ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const [, , script, ...rest] = process.argv;
  if (!script) {
    console.error('Usage: bun scripts/run.ts <script> [--include-private]');
    process.exit(1);
  }
  const includePrivate = rest.includes('--include-private');

  const all = loadPackages();
  const filtered = all.filter((p) => (includePrivate || !p.private) && p.scripts[script]);
  if (filtered.length === 0) {
    console.log(`No packages define script "${script}". Skipping.`);
    return;
  }

  const layers = topoLayers(filtered);
  for (const [i, layer] of layers.entries()) {
    const names = layer.map((p) => p.name).join(', ');
    console.log(`\n→ Layer ${i + 1}/${layers.length} [${script}]: ${names}`);
    await Promise.all(layer.map((p) => runScript(p, script)));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
