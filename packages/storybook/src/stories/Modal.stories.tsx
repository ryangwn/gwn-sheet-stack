import React, { useMemo } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { Modal, StackProvider, Stage, useStack } from '@gwn-sheet-stack/react';
import type { Meta, StoryObj } from '@storybook/react';

function Trigger({ kind, label = 'Open modal' }: { kind: string; label?: string }) {
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

function DefaultModalContent() {
  return (
    <Modal size="md" dismissible>
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Default Modal</h2>
        <p>Click outside or press Escape to dismiss.</p>
      </div>
    </Modal>
  );
}

function NonDismissibleContent() {
  const { pop } = useStack();
  return (
    <Modal size="md" dismissible={false}>
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Non-dismissible Modal</h2>
        <p>Clicking outside does nothing. You must use the button below.</p>
        <button
          onClick={() => pop()}
          style={{ padding: '8px 16px', cursor: 'pointer', marginTop: 8 }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function SmallModalContent() {
  return (
    <Modal size="sm">
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Small Modal</h2>
        <p>400px wide.</p>
      </div>
    </Modal>
  );
}

function LargeModalContent() {
  return (
    <Modal size="lg">
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Large Modal</h2>
        <p>720px wide — good for forms or detail views.</p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>
    </Modal>
  );
}

function FitModalContent() {
  return (
    <Modal size="fit">
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Fit Modal</h2>
        <p>Width matches its content.</p>
      </div>
    </Modal>
  );
}

const meta: Meta = {
  title: 'Modal',
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ modal: DefaultModalContent }} kind="modal" label="Open modal" />
  ),
};

export const NonDismissible: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ modal: NonDismissibleContent }}
      kind="modal"
      label="Open non-dismissible modal"
    />
  ),
};

export const SmallSize: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ modal: SmallModalContent }} kind="modal" label="Open small modal" />
  ),
};

export const LargeSize: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ modal: LargeModalContent }} kind="modal" label="Open large modal" />
  ),
};

export const FitSize: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ modal: FitModalContent }} kind="modal" label="Open fit modal" />
  ),
};
