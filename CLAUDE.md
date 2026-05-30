# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Project rules

### Tooling

- Use **bun** for installs, scripts, and binaries. Never npm/npx/pnpm/yarn (overrides global pnpm default).
- Prefer locally-pinned binaries (`bunx <bin-name>`) over remote fetches (`bunx <pkg-name>`).
- **NEVER** add `Co-Authored-By` trailers to commit messages — overrides the default Claude Code commit template.

### Releases & versioning

- Always use `bun changeset` → `bun changeset version`. Do not hand-edit `CHANGELOG.md` or `package.json` versions.
- Workspace is pre-1.0: use `minor` for breaking, `patch` otherwise — avoids 0.x major cascade onto dependents.

### Verification before commit

- Run `bun test` in the affected package(s) before commit; don't rely on lefthook alone.
- Strip any debug `console.log` before `/git cm` — not after.
- When packages consume each other via `dist/`, rebuild core before assuming demo apps see new types.

### Code rules

- File naming: **kebab-case** (enforced — see `docs/CODE_CONVENTION.md`, commit 27e03dc).
- Use TypeScript `private` modifier, not ES `#`-prefixed fields.
- Layer ids are content-addressed and may contain JSON/quotes — always `CSS.escape()` before interpolating into selectors.

### Workflow paths

- Drafts, plans, PRDs → `.scratch/<topic>/` (overrides global `plans/` and `research-<topic>.md`).
- `/docs` is **gitignored** — edits there don't ship. Mirror load-bearing content into tracked files (README, type docstrings, storybook MDX).

### Tool selection

- For symbol/architecture/trace questions, prefer `mcp__codegraph__*` over grep + Read loops. Codegraph is the pre-built index.

### Agent skills

- **Issues**: GitHub Issues (primary), Notion for planning/PRDs, `.scratch/` for local drafts → `docs/agents/issue-tracker.md`
- **Triage labels**: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` → `docs/agents/triage-labels.md`
- **Domain docs**: single-context repo — `CONTEXT.md` + `docs/adr/` at root → `docs/agents/domain.md`

### Conventions

@docs/CODE_CONVENTION.md

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
