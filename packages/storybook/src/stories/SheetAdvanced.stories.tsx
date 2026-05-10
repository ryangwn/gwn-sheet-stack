import React, { useMemo, useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { createStackStore, googleMapsDetents } from 'gwn-sheet-stack-core';
import {
  Sheet,
  StackProvider,
  Stage,
  useLifecycle,
  useSheetGesture,
  useStack,
} from 'gwn-sheet-stack-react';

// ─── Shared scene ─────────────────────────────────────────────────────────────

function Trigger({ kind, label = 'Open sheet' }: { kind: string; label?: string }) {
  const { push } = useStack();
  return (
    <button
      onClick={() => push({ kind })}
      style={{
        padding: '10px 20px',
        fontSize: 15,
        cursor: 'pointer',
        borderRadius: 8,
        border: '1px solid #ccc',
        background: '#fff',
      }}
    >
      {label}
    </button>
  );
}

function SceneWrapper({
  registry,
  kind,
  label,
}: {
  registry: Record<string, React.ComponentType>;
  kind: string;
  label?: string;
}) {
  const store = useMemo(() => createStackStore({ mountWindow: 10, maxDepth: 10 }), []);
  return (
    <StackProvider value={store}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#f5f5f5',
        }}
      >
        <Trigger kind={kind} label={label} />
      </div>
      <Stage registry={registry} mountWindow={10} />
    </StackProvider>
  );
}

// ─── 1. Handle-only drag ──────────────────────────────────────────────────────

function HandleOnlyContent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const detents = useMemo(
    () => [
      { id: 'collapsed', size: 0.35 },
      { id: 'expanded', size: 0.85 },
    ],
    [],
  );

  // Wire pointer gestures only to the handle, not the whole container.
  useSheetGesture({
    containerRef,
    panTargetRef: handleRef,
    detents,
    currentDetentId: 'collapsed',
    dismissible: true,
  });

  return (
    <Sheet.Container
      detents={detents}
      initialDetent="collapsed"
      side="bottom"
      enableGesture={false}
    >
      <Sheet.Backdrop />
      <Sheet.Handle ref={handleRef} />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Handle-only drag
        </h2>
      </Sheet.Header>
      <Sheet.Content
        style={{
          padding: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - var(--ss-translate, 0px))',
        }}
      >
        <p>Drag the handle — the body does not respond to pointer drags.</p>
        <p>Useful when the body needs to scroll independently or hosts complex inputs.</p>
        <button style={{ padding: '8px 14px' }}>Buttons inside the body still click cleanly</button>
      </Sheet.Content>
    </Sheet.Container>
  );
}

// ─── 2. topEdgeScroll='expand' with scrollable content ────────────────────────

function ScrollableContent() {
  return (
    <Sheet.Container
      detents={[
        { id: 'mid', size: 0.5 },
        { id: 'full', size: 0.95 },
      ]}
      initialDetent="mid"
      side="bottom"
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Scrollable list
        </h2>
      </Sheet.Header>
      <Sheet.Content
        style={{
          padding: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - var(--ss-translate, 0px))',
        }}
      >
        <p>At the largest detent, body scroll is enabled. Drag from the top edge to collapse.</p>
        <ul style={{ paddingLeft: 20 }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <li key={i} style={{ padding: '6px 0' }}>
              List item {i + 1}
            </li>
          ))}
        </ul>
      </Sheet.Content>
    </Sheet.Container>
  );
}

// ─── 3. useLifecycle event log ────────────────────────────────────────────────

function LifecycleLogContent() {
  const [log, setLog] = useState<string[]>([]);
  const append = (msg: string) =>
    setLog((l) => [...l, `${new Date().toISOString().slice(11, 19)} ${msg}`]);

  useLifecycle({
    onLoad: () => append('onLoad'),
    onWillAppear: () => append('onWillAppear'),
    onDidAppear: () => append('onDidAppear'),
    onWillDisappear: () => append('onWillDisappear'),
    onDidDisappear: () => append('onDidDisappear'),
  });

  return (
    <Sheet.Container detents={[{ id: 'default', size: 0.6 }]} initialDetent="default" side="bottom">
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Lifecycle log
        </h2>
      </Sheet.Header>
      <Sheet.Content
        style={{
          padding: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - var(--ss-translate, 0px))',
        }}
      >
        <p>Open, close, push another layer to see lifecycle callbacks fire.</p>
        <pre
          style={{
            background: '#111',
            color: '#0f0',
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            maxHeight: 240,
            overflow: 'auto',
            margin: 0,
          }}
        >
          {log.join('\n') || '(no events yet)'}
        </pre>
      </Sheet.Content>
    </Sheet.Container>
  );
}

// ─── 4. googleMapsDetents preset ──────────────────────────────────────────────

function GoogleMapsPresetContent() {
  return (
    <Sheet.Container
      detents={googleMapsDetents}
      initialDetent={googleMapsDetents[1]!.id}
      side="bottom"
      largestUndimmedDetentId={googleMapsDetents[1]!.id}
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Search results
        </h2>
      </Sheet.Header>
      <Sheet.Content
        style={{
          padding: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - var(--ss-translate, 0px))',
        }}
      >
        <p>
          Uses the <code>googleMapsDetents</code> preset from <code>gwn-sheet-stack-core</code>.
        </p>
        <p>Detents: {googleMapsDetents.map((d) => `${d.id} (${d.size})`).join(', ')}.</p>
        <p>Drag down to the collapsed detent, up to expanded.</p>
      </Sheet.Content>
    </Sheet.Container>
  );
}

// ─── 5. Input + keyboard avoidance ────────────────────────────────────────────

function FormContent() {
  return (
    <Sheet.Container
      detents={[{ id: 'default', size: 0.55 }]}
      initialDetent="default"
      side="bottom"
      repositionInputs
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Edit profile
        </h2>
      </Sheet.Header>
      <Sheet.Content
        style={{
          padding: 16,
          display: 'grid',
          gap: 10,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - var(--ss-translate, 0px))',
        }}
      >
        <p style={{ margin: 0 }}>
          On mobile keyboards, the sheet repositions to keep the focused input visible.
        </p>
        <label style={{ display: 'grid', gap: 4 }}>
          Name
          <input style={{ padding: 8, fontSize: 14 }} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Email
          <input type="email" style={{ padding: 8, fontSize: 14 }} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Bio
          <textarea rows={3} style={{ padding: 8, fontSize: 14 }} />
        </label>
      </Sheet.Content>
    </Sheet.Container>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = { title: 'Sheet/Advanced' };
export default meta;

export const HandleOnlyDrag: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ sheet: HandleOnlyContent }}
      kind="sheet"
      label="Open handle-only sheet"
    />
  ),
};

export const ScrollableBody: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ sheet: ScrollableContent }}
      kind="sheet"
      label="Open scrollable sheet"
    />
  ),
};

export const LifecycleLog: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ sheet: LifecycleLogContent }}
      kind="sheet"
      label="Open lifecycle-logging sheet"
    />
  ),
};

export const GoogleMapsPreset: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ sheet: GoogleMapsPresetContent }}
      kind="sheet"
      label="Open maps preset sheet"
    />
  ),
};

export const KeyboardAvoidance: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ sheet: FormContent }} kind="sheet" label="Open form sheet" />
  ),
};
