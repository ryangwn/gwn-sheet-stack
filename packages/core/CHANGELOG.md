# @gwn-sheet-stack/core

## 0.1.0

### Minor Changes

- Headless pivot cleanup: remove `animation/`, `gesture/`, `spring/`, `event/motionValue`, `resolvePresentation`, `googleMapsDetents`. Everything that became dead after the React surface dropped its built-in motion/gesture layer. `historyAdapter` is kept on the public surface for upcoming URL-sync work.

## 0.0.4

### Patch Changes

- Refactor: rename to scoped `@gwn-sheet-stack/*` packages
- Test: drop depth-2+ hidden tests for push/sheet/modal
- Chore: override transitive `fast-uri` to patched 3.1.2
- Chore: remove eslint-disable directives, fix hook deps and type any
