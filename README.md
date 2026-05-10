# sheet-stack

Stacked sheet, modal, panel, and push-screen UIs for React and Svelte. Framework-agnostic core; pluggable router adapters; one Stage host per app.

> Status: pre-1.0. APIs may shift before the first published release.

## Packages

| Package                                                                          | Description                                                                                                             |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`@gwn-sheet-stack/core`](packages/core)                                         | Framework-agnostic primitives: FSM, gesture decisions, spring driver, presentation, event bus, router-adapter contract. |
| [`@gwn-sheet-stack/react`](packages/react)                                       | React bindings: `<Stage>`, hooks (`useStack`, `useLayerAnimation`, …), `MotionCoordinator`.                             |
| [`@gwn-sheet-stack/svelte`](packages/svelte)                                     | Svelte 5 bindings: `Stage`, `Sheet`, `Modal`, `Panel`, `PushScreen`, `LayerHost`.                                       |
| [`@gwn-sheet-stack/adapters-router-next`](packages/adapters-router-next)         | Next.js App Router adapter.                                                                                             |
| [`@gwn-sheet-stack/adapters-router-tanstack`](packages/adapters-router-tanstack) | TanStack Router adapter.                                                                                                |

`core` is a **peer dependency** of every framework and adapter package — install both. This guarantees a single instance of the event bus, store, and FSM at runtime.

## Install

React:

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react
```

Svelte:

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/svelte
```

With a router adapter:

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react @gwn-sheet-stack/adapters-router-next
```

## Concepts

A **Layer** is one overlay in a stack — it has an id, a `kind` (registry key), an FSM `phase`, and a `presentation` (`sheet | modal | panel | push`). The **Stage** is the single host component that mounts every Layer in the stack and lives in the **StackStore**, a vanilla-TS state container that runs the FSM and broadcasts changes.

Layers can be serialized to URL through a pluggable **RouterAdapter**. Backgrounded Layers stay mounted up to the **mount window**; beyond that they serialize to a **Snapshot** and re-hydrate on re-entry.

For the full domain vocabulary see [`CONTEXT.md`](./CONTEXT.md).

## Repository layout

```
packages/
  core/                          framework-agnostic primitives
  react/                         React bindings
  svelte/                        Svelte 5 bindings
  adapters-router-next/          Next.js App Router adapter
  adapters-router-tanstack/      TanStack Router adapter
  storybook/                     internal Storybook (private)
scripts/
  run.ts                         topological per-package script runner
  verify-dist.ts                 prepublish artifact verifier
docs/                            domain docs + ADRs
```

## Development

Requires [Bun](https://bun.com) ≥ 1.3.

```bash
bun install
bun run build         # topological build across all packages
bun run typecheck     # tsc --noEmit per package, topological
bun test              # bun's test runner
bun run lint
bun run storybook     # internal Storybook, port 6006
```

### Build orchestration

`bun run build`, `bun run typecheck`, and `bun run verify:dist` all delegate to `scripts/run.ts`, which discovers workspaces, builds the dependency graph from `workspace:*` edges, and runs each per-package script in topological layers with intra-layer parallelism. Fail-fast.

### Prepublish verification

`bun run verify:dist` runs four checks per public package:

1. Existence of every file referenced by `main`, `types`, `svelte`, and any `exports` condition.
2. Tarball allowlist via `bun pm pack --dry-run` — only `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`, and `package.json` are allowed.
3. [`publint`](https://publint.dev) — validates `package.json` against npm/Node ESM rules.
4. [`@arethetypeswrong/cli`](https://arethetypeswrong.github.io) (`--profile esm-only`) — verifies `.d.ts` resolution under bundler and Node 16 ESM.

Errors fail the run; warnings print but don't fail.

## Releases

Versioning is driven by [Changesets](https://github.com/changesets/changesets). To propose a release:

```bash
bun run changeset       # write a changeset markdown describing the change
git commit -am '…'
```

When the changeset PR merges to `main`:

1. The **CI** workflow runs lint, typecheck, test, audit, and `verify:dist`.
2. On CI success, the **Release** workflow triggers via `workflow_run`. It checks out the verified SHA, runs `bun install --frozen-lockfile`, `bun run build`, `bun run verify:dist`, then `changesets/action` either opens a "Version Packages" PR or, if one was already merged, publishes to npm.

Publishes use **npm provenance** (`NPM_CONFIG_PROVENANCE: "true"` + `id-token: write`).

### Required secrets

- `NPM_TOKEN` — npm automation token with publish rights to the `gwn-sheet-stack-*` packages.
- `GITHUB_TOKEN` — provided automatically.

## Contributing

- Use **Bun** for all installs, scripts, and binaries — never `npm`/`npx`/`pnpm`.
- All commits run through `lefthook` (commitlint + lint-staged).
- Conventional Commits enforced.
- Domain language is documented in [`CONTEXT.md`](./CONTEXT.md); architectural decisions in [`docs/adr/`](./docs/adr).

## Security

See [`SECURITY.md`](./SECURITY.md). Report vulnerabilities to `info@vitalmin.vn`.

## License

[MIT](./LICENSE).
