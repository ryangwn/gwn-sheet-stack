import React, { useMemo } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { createStackStore } from 'gwn-sheet-stack-core';
import {
  Modal,
  Panel,
  PushScreen,
  Sheet,
  StackProvider,
  Stage,
  useStack,
  useStackState,
} from 'gwn-sheet-stack-react';

const btn: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 14,
  cursor: 'pointer',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#fff',
};

function StackBadge() {
  const state = useStackState();
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        borderRadius: 999,
        fontSize: 12,
        fontFamily: 'monospace',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      stack: [{state.stack.map((l) => `${l.kind}:${l.phase}`).join(' → ') || 'empty'}]
    </div>
  );
}

function PushButtons() {
  const { push } = useStack();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button style={btn} onClick={() => push({ kind: 'modal' })}>
        Push modal
      </button>
      <button style={btn} onClick={() => push({ kind: 'sheet' })}>
        Push sheet
      </button>
      <button style={btn} onClick={() => push({ kind: 'panel' })}>
        Push panel
      </button>
      <button style={btn} onClick={() => push({ kind: 'push' })}>
        Push screen
      </button>
    </div>
  );
}

function PopButton() {
  const { pop, dismissAll } = useStack();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button style={btn} onClick={() => pop()}>
        Pop
      </button>
      <button style={btn} onClick={() => dismissAll()}>
        Close all
      </button>
    </div>
  );
}

function ModalLayer() {
  return (
    <Modal size="md" dismissible>
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Modal layer</h2>
        <p>Push another layer to grow the stack.</p>
        <PushButtons />
        <div style={{ marginTop: 12 }}>
          <PopButton />
        </div>
      </div>
    </Modal>
  );
}

function SheetLayer() {
  return (
    <Sheet.Container
      detents={[
        { id: 'mid', size: 0.5 },
        { id: 'full', size: 0.92 },
      ]}
      initialDetent="mid"
      side="bottom"
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <h2 style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>Sheet layer</h2>
      </Sheet.Header>
      <Sheet.Content style={{ padding: 16 }}>
        <p>Stack another layer or pop.</p>
        <PushButtons />
        <div style={{ marginTop: 12 }}>
          <PopButton />
        </div>
      </Sheet.Content>
    </Sheet.Container>
  );
}

function PanelLayer() {
  return (
    <Panel side="right" width={360}>
      <div style={{ padding: 24, height: '100%', boxSizing: 'border-box' }}>
        <h2 style={{ marginTop: 0 }}>Panel layer</h2>
        <p>Right-anchored drawer.</p>
        <PushButtons />
        <div style={{ marginTop: 12 }}>
          <PopButton />
        </div>
      </div>
    </Panel>
  );
}

function PushScreenLayer() {
  return (
    <PushScreen edgeSwipeBack>
      <div
        style={{
          padding: 32,
          height: '100%',
          background: '#fff',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Push screen layer</h2>
        <p>Full-screen push. Edge-swipe back enabled.</p>
        <PushButtons />
        <div style={{ marginTop: 12 }}>
          <PopButton />
        </div>
      </div>
    </PushScreen>
  );
}

const registry = {
  modal: ModalLayer,
  sheet: SheetLayer,
  panel: PanelLayer,
  push: PushScreenLayer,
};

function Scene() {
  const store = useMemo(() => createStackStore({ mountWindow: 10, maxDepth: 10 }), []);
  return (
    <StackProvider value={store}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          height: '100vh',
          background: '#f5f5f5',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Stack demo</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Push any presentation. Then push another from inside it. Pop to unwind.
        </p>
        <PushButtons />
      </div>
      <StackBadge />
      <Stage registry={registry} mountWindow={10} />
    </StackProvider>
  );
}

const meta: Meta = { title: 'Stack' };
export default meta;

export const MultiLayer: StoryObj = { render: () => <Scene /> };
