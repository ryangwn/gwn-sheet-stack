import React, { useMemo, useState } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { StackProvider, Stage, useStack, useStackState } from '@gwn-sheet-stack/react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Meta, StoryObj } from '@storybook/react';
import { Drawer } from 'vaul';

import {
  ArticleListScreen,
  MobileFrame,
  PortalContainerContext,
  articleFeedRegistry,
} from './article-feed';
import { useRadixDialog } from './useRadixDialog';
import { useVaulLayer } from './useVaulLayer';

const RADIX_DIALOG_STYLES = `
  @keyframes radix-overlay-in { from { opacity: 0 } to { opacity: 1 } }
  @keyframes radix-overlay-out { from { opacity: 1 } to { opacity: 0 } }
  @keyframes radix-content-in {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes radix-content-out {
    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    to   { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  }
  .radix-overlay[data-state='open']  { animation: radix-overlay-in  150ms cubic-bezier(0.16, 1, 0.3, 1); }
  .radix-overlay[data-state='closed']{ animation: radix-overlay-out 150ms cubic-bezier(0.16, 1, 0.3, 1); }
  .radix-content[data-state='open']  { animation: radix-content-in  200ms cubic-bezier(0.16, 1, 0.3, 1); }
  .radix-content[data-state='closed']{ animation: radix-content-out 200ms cubic-bezier(0.16, 1, 0.3, 1); }
`;

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

const btn: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 14,
  cursor: 'pointer',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#fff',
  transition: `transform 160ms ${EASE_OUT}`,
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
      <button style={btn} onClick={() => push({ kind: 'radix' })}>
        Push Radix dialog
      </button>
      <button style={btn} onClick={() => push({ kind: 'vaul' })}>
        Push Vaul drawer
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

function RadixDialogLayer() {
  const radix = useRadixDialog();
  return (
    <Dialog.Root {...radix}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="radix-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
        <Dialog.Content
          className="radix-content"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transformOrigin: 'center',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            minWidth: 360,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
        >
          <Dialog.Title style={{ marginTop: 0 }}>Radix dialog layer</Dialog.Title>
          <p>Push another layer on top to grow the stack.</p>
          <PushButtons />
          <div style={{ marginTop: 12 }}>
            <PopButton />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function VaulDrawerLayer() {
  const vaul = useVaulLayer();

  return (
    <Drawer.Root {...vaul}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
        <Drawer.Content
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#fff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 24,
            maxHeight: '85vh',
          }}
        >
          <Drawer.Title style={{ marginTop: 0 }}>Vaul drawer layer</Drawer.Title>
          <p>Swipe down or click the backdrop. Both flow through the FSM.</p>
          <PushButtons />
          <div style={{ marginTop: 12 }}>
            <PopButton />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const registry = {
  radix: RadixDialogLayer,
  vaul: VaulDrawerLayer,
  ...articleFeedRegistry,
};

function Scene() {
  const store = useMemo(() => createStackStore({ mountWindow: 10, maxDepth: 10 }), []);
  return (
    <StackProvider value={store}>
      <style>{RADIX_DIALOG_STYLES}</style>
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
        <h1 style={{ margin: 0, fontSize: 22 }}>Stack demo — mixed third-party surfaces</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Push a Radix dialog. Then push a Vaul drawer on top. Pop to unwind.
        </p>
        <PushButtons />
      </div>
      <StackBadge />
      <Stage registry={registry} mountWindow={10} />
    </StackProvider>
  );
}

function MobileArticleScene() {
  const store = useMemo(() => createStackStore({ mountWindow: 10, maxDepth: 10 }), []);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <StackProvider value={store}>
      <PortalContainerContext.Provider value={frame}>
        <style>{RADIX_DIALOG_STYLES}</style>
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: '100vh',
            background: '#e7e5e4',
          }}
        >
          <MobileFrame frameRef={setFrame}>
            <ArticleListScreen />
          </MobileFrame>
        </div>
        <StackBadge />
        <Stage registry={registry} mountWindow={10} container={frame} />
      </PortalContainerContext.Provider>
    </StackProvider>
  );
}

const meta: Meta = { title: 'Stack' };
export default meta;

export const MultiLayer: StoryObj = { render: () => <Scene /> };
export const MobileArticleFeed: StoryObj = { render: () => <MobileArticleScene /> };
