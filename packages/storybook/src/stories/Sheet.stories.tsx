import React, { useMemo } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { createStackStore } from 'gwn-sheet-stack-core';
import { Sheet, StackProvider, Stage, useStack } from 'gwn-sheet-stack-react';

// ─── Shared scene helpers ─────────────────────────────────────────────────────

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

// ─── Sheet content components ─────────────────────────────────────────────────

function BottomSheetContent() {
  return (
    <Sheet.Container
      detents={[
        { id: 'collapsed', size: 0.35 },
        { id: 'expanded', size: 0.85 },
      ]}
      initialDetent="collapsed"
      side="bottom"
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Bottom Sheet
        </h2>
      </Sheet.Header>
      <Sheet.Content style={{ padding: '16px' }}>
        <p>Drag the handle to snap between detents.</p>
        <p>This sheet has two detents: 35% and 85% of the viewport height.</p>
      </Sheet.Content>
    </Sheet.Container>
  );
}

function GoogleMapsStyleContent() {
  return (
    <Sheet.Container
      detents={[
        { id: 'collapsed', size: 0.15 },
        { id: 'anchor', size: 0.5 },
        { id: 'expanded', size: 1.0 },
      ]}
      initialDetent="anchor"
      side="bottom"
      largestUndimmedDetentId="anchor"
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
          padding: '16px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - var(--ss-translate, 0px))',
        }}
      >
        <p>Three detents: 15%, 50%, 100%. Backdrop stays transparent up to anchor.</p>
      </Sheet.Content>
    </Sheet.Container>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Sheet',
};

export default meta;

// ─── Stories ─────────────────────────────────────────────────────────────────

export const BottomSheet: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ sheet: BottomSheetContent }} kind="sheet" label="Open bottom sheet" />
  ),
};

export const GoogleMapsStyle: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ sheet: GoogleMapsStyleContent }}
      kind="sheet"
      label="Open maps-style sheet"
    />
  ),
};
