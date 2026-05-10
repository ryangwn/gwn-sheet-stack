# gwn-sheet-stack-core

Framework-agnostic primitives for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack): the FSM, gesture decisions, spring driver, presentation rules, event bus, and router-adapter contract.

You probably want to install one of the framework bindings instead — `gwn-sheet-stack-react` or `gwn-sheet-stack-svelte`. This package is what they share.

## Install

```bash
bun add gwn-sheet-stack-core
```

`gwn-sheet-stack-core` must be present as a single instance at runtime. It is declared as a `peerDependency` of every framework and adapter package; install it once.

## What lives here

- **StackStore** — `createStackStore`, `LRUMountWindow`, `Layer`, `State`, `RouterAdapter`. The vanilla-TS state container that runs the FSM, broadcasts changes, owns the mount window, and wires the router adapter.
- **FSM** — `LayerPhase` (`mounting | presenting | active | background | dragging | snapping | dismissing | evicted`), `LayerEvent`, `renderModeFor`, `PresentationKind`.
- **Gesture decisions** — `chooseSnapTarget` (sheets), `decidePushGesture` (push-screens), `rubberBand` (overscroll math), `GestureOutcome`.
- **Spring** — `springParams`, `springAt`, `SPRING_DEFAULTS`, `SpringDriver`, `MotionValue`.
- **Animation seam** — `LayerAnimation`, `AnimationDescriptor`, `AnimationValues`, `AnimationSink`.
- **Presentation** — `resolvePresentation`, `inertForLayer`, `computeBackdropOpacity`.
- **Router** — `historyAdapter` reference implementation; concrete adapters live in `gwn-sheet-stack-adapters-router-*`.
- **Event bus** — `EventBus`.

## Domain vocabulary

The full vocabulary (Layer, Stage, Stack, Detent, Snapshot, Mount window, …) is documented in [`CONTEXT.md`](https://github.com/ryangwn/gwn-sheet-stack/blob/main/CONTEXT.md). Use those terms exactly.

## License

MIT
