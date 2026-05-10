import React, { useMemo } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { Sheet, StackProvider, Stage, useStack } from '@gwn-sheet-stack/react';
import type { Meta, StoryObj } from '@storybook/react';

function Trigger({ kind, label }: { kind: string; label: string }) {
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

function PageScaffold({
  registry,
  triggerLabel,
  scaleWrapper = false,
}: {
  registry: Record<string, React.ComponentType>;
  triggerLabel: string;
  scaleWrapper?: boolean;
}) {
  const store = useMemo(() => createStackStore({ mountWindow: 10, maxDepth: 10 }), []);
  return (
    <StackProvider value={store}>
      <div
        {...(scaleWrapper ? { 'data-sheetstack-wrapper': '' } : {})}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f5f5f5',
        }}
      >
        <Trigger kind="sheet" label={triggerLabel} />
      </div>
      <Stage registry={registry} mountWindow={10} />
    </StackProvider>
  );
}

function A11ySheet() {
  return (
    <Sheet.Container detents={[{ id: 'default', size: 0.5 }]} initialDetent="default" side="bottom">
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <Sheet.Title style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Confirm purchase
        </Sheet.Title>
      </Sheet.Header>
      <Sheet.Content style={{ padding: '16px' }}>
        <Sheet.Description style={{ margin: '0 0 16px' }}>
          You are about to be charged $42.00. Press Escape to cancel.
        </Sheet.Description>
        <Sheet.Close
          style={{
            padding: '8px 16px',
            border: '1px solid #ccc',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Close
        </Sheet.Close>
      </Sheet.Content>
    </Sheet.Container>
  );
}

function ScaleSheet() {
  return (
    <Sheet.Container
      detents={[{ id: 'default', size: 0.6 }]}
      initialDetent="default"
      side="bottom"
      shouldScaleBackground
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Content style={{ padding: '16px' }}>
        <p>The page behind this sheet scales down — vaul's signature iOS-Music look.</p>
      </Sheet.Content>
    </Sheet.Container>
  );
}

function FadeFromIndexSheet() {
  return (
    <Sheet.Container
      detents={[
        { id: 'low', size: 0.2 },
        { id: 'mid', size: 0.55 },
        { id: 'high', size: 0.95 },
      ]}
      initialDetent="low"
      side="bottom"
      fadeFromIndex={2}
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <Sheet.Title style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Three detents, fadeFromIndex=2
        </Sheet.Title>
      </Sheet.Header>
      <Sheet.Content style={{ padding: '16px' }}>
        <p>Backdrop opacity grows from 0 → 0.5 → 1 as you snap from low → mid → high.</p>
      </Sheet.Content>
    </Sheet.Container>
  );
}

function makeCloseThresholdSheet(closeThreshold: number, label: string) {
  return function CloseThresholdSheet() {
    return (
      <Sheet.Container
        detents={[{ id: 'default', size: 0.5 }]}
        initialDetent="default"
        side="bottom"
        closeThreshold={closeThreshold}
      >
        <Sheet.Backdrop />
        <Sheet.Handle />
        <Sheet.Header>
          <Sheet.Title>{label}</Sheet.Title>
        </Sheet.Header>
        <Sheet.Content style={{ padding: '16px' }}>
          <Sheet.Description>
            closeThreshold = {closeThreshold}. Drag the handle down to test the dismiss distance.
            Slow drags past this fraction of viewport height force a close, regardless of release
            velocity.
          </Sheet.Description>
        </Sheet.Content>
      </Sheet.Container>
    );
  };
}

const EasyCloseSheet = makeCloseThresholdSheet(0.1, 'Easy close — drag 10%');
const DefaultCloseSheet = makeCloseThresholdSheet(0.25, 'Default close — drag 25% (vaul)');
const HardCloseSheet = makeCloseThresholdSheet(0.5, 'Hard close — drag 50%');
const VelocityOnlySheet = makeCloseThresholdSheet(1, 'Velocity-only — flick to close');

function NonDismissibleSheet() {
  return (
    <Sheet.Container
      detents={[{ id: 'default', size: 0.5 }]}
      initialDetent="default"
      side="bottom"
      dismissible={false}
    >
      <Sheet.Backdrop />
      <Sheet.Handle />
      <Sheet.Header>
        <Sheet.Title style={{ margin: 0, padding: '0 16px', fontSize: 17, fontWeight: 600 }}>
          Required action
        </Sheet.Title>
      </Sheet.Header>
      <Sheet.Content style={{ padding: '16px' }}>
        <p>Escape is suppressed. Use the explicit Close button.</p>
        <Sheet.Close
          style={{
            padding: '8px 16px',
            border: '1px solid #ccc',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Acknowledge
        </Sheet.Close>
      </Sheet.Content>
    </Sheet.Container>
  );
}

const meta: Meta = {
  title: 'Sheet/Vaul-inspired',
};

export default meta;

export const A11yTitleDescription: StoryObj = {
  render: () => (
    <PageScaffold registry={{ sheet: A11ySheet }} triggerLabel="Open accessible sheet" />
  ),
};

export const BackgroundScale: StoryObj = {
  render: () => (
    <PageScaffold registry={{ sheet: ScaleSheet }} triggerLabel="Open scaling sheet" scaleWrapper />
  ),
};

export const FadeFromIndex: StoryObj = {
  render: () => (
    <PageScaffold registry={{ sheet: FadeFromIndexSheet }} triggerLabel="Open faded sheet" />
  ),
};

export const NonDismissible: StoryObj = {
  render: () => (
    <PageScaffold registry={{ sheet: NonDismissibleSheet }} triggerLabel="Open required sheet" />
  ),
};

export const CloseThresholdEasy: StoryObj = {
  name: 'Drag-to-close: 10% (easy)',
  render: () => (
    <PageScaffold registry={{ sheet: EasyCloseSheet }} triggerLabel="Open easy-close sheet" />
  ),
};

export const CloseThresholdDefault: StoryObj = {
  name: 'Drag-to-close: 25% (vaul default)',
  render: () => (
    <PageScaffold registry={{ sheet: DefaultCloseSheet }} triggerLabel="Open default-close sheet" />
  ),
};

export const CloseThresholdHard: StoryObj = {
  name: 'Drag-to-close: 50% (hard)',
  render: () => (
    <PageScaffold registry={{ sheet: HardCloseSheet }} triggerLabel="Open hard-close sheet" />
  ),
};

export const CloseThresholdVelocityOnly: StoryObj = {
  name: 'Drag-to-close: velocity-only (flick)',
  render: () => (
    <PageScaffold registry={{ sheet: VelocityOnlySheet }} triggerLabel="Open velocity-only sheet" />
  ),
};
