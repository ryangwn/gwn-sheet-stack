import React, { useMemo } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { Panel, StackProvider, Stage, useStack } from '@gwn-sheet-stack/react';
import type { Meta, StoryObj } from '@storybook/react';

function Trigger({ kind, label = 'Open panel' }: { kind: string; label?: string }) {
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

function RightPanelContent() {
  return (
    <Panel side="right" width={320} modal>
      <div style={{ padding: 24, height: '100%', background: '#fff', boxSizing: 'border-box' }}>
        <h2 style={{ marginTop: 0 }}>Right Panel</h2>
        <p>Slides in from the right. Click outside to close.</p>
        <nav>
          {['Home', 'Profile', 'Settings', 'Help'].map((item) => (
            <div key={item} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
              {item}
            </div>
          ))}
        </nav>
      </div>
    </Panel>
  );
}

function LeftPanelContent() {
  return (
    <Panel side="left" width={280} modal>
      <div style={{ padding: 24, height: '100%', background: '#fff', boxSizing: 'border-box' }}>
        <h2 style={{ marginTop: 0 }}>Left Panel</h2>
        <p>Slides in from the left.</p>
        <nav>
          {['Dashboard', 'Analytics', 'Reports', 'Users'].map((item) => (
            <div key={item} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
              {item}
            </div>
          ))}
        </nav>
      </div>
    </Panel>
  );
}

function NonModalPanelContent() {
  return (
    <Panel side="right" width={320} modal={false}>
      <div
        style={{
          padding: 24,
          height: '100%',
          background: '#fff',
          boxSizing: 'border-box',
          borderLeft: '1px solid #e0e0e0',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Non-modal Panel</h2>
        <p>No backdrop — background content stays interactive.</p>
      </div>
    </Panel>
  );
}

const meta: Meta = {
  title: 'Panel',
};

export default meta;

export const RightPanel: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ panel: RightPanelContent }} kind="panel" label="Open right panel" />
  ),
};

export const LeftPanel: StoryObj = {
  render: () => (
    <SceneWrapper registry={{ panel: LeftPanelContent }} kind="panel" label="Open left panel" />
  ),
};

export const NonModalPanel: StoryObj = {
  render: () => (
    <SceneWrapper
      registry={{ panel: NonModalPanelContent }}
      kind="panel"
      label="Open non-modal panel"
    />
  ),
};
