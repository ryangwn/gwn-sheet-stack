import React, { useMemo } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { createStackStore } from 'gwn-sheet-stack-core';
import { PushScreen, StackProvider, Stage, useStack } from 'gwn-sheet-stack-react';

// ─── Shared scene helpers ─────────────────────────────────────────────────────

function Trigger({ kind, label = 'Push screen' }: { kind: string; label?: string }) {
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

// ─── PushScreen content components ───────────────────────────────────────────

function DefaultScreenContent() {
  const { pop } = useStack();
  return (
    <PushScreen edgeSwipeBack>
      <div
        style={{
          height: '100%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => pop()}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          ← Back
        </button>
        <h1 style={{ marginTop: 0 }}>Pushed Screen</h1>
        <p>Slides in from the right. On mobile, swipe from the left edge to go back.</p>
        <p>Click the back button or use edge swipe to dismiss.</p>
      </div>
    </PushScreen>
  );
}

function NoEdgeSwipeContent() {
  const { pop } = useStack();
  return (
    <PushScreen edgeSwipeBack={false}>
      <div
        style={{
          height: '100%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => pop()}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          ← Back
        </button>
        <h1 style={{ marginTop: 0 }}>No Edge Swipe</h1>
        <p>Edge swipe back is disabled — must use the back button.</p>
      </div>
    </PushScreen>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'PushScreen',
};

export default meta;

// ─── Stories ─────────────────────────────────────────────────────────────────

export const Default: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ screen: DefaultScreenContent }} kind="screen" label="Push screen" />
  ),
};

export const NoEdgeSwipe: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ screen: NoEdgeSwipeContent }}
      kind="screen"
      label="Push screen (no edge swipe)"
    />
  ),
};
