import React, { useMemo, useState } from 'react';

import { createStackStore, historyAdapter } from '@gwn-sheet-stack/core';
import type { RouteEntry } from '@gwn-sheet-stack/core';
import { StackProvider, useStack, useStackState } from '@gwn-sheet-stack/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = { title: 'Adapters/Generic historyAdapter route table' };
export default meta;

interface ArticleProps {
  id: string;
}

const articleRoute: RouteEntry = {
  pattern: '/articles/:id',
  kind: 'article',
  extract: (params) => ({ id: params.id }) satisfies ArticleProps,
  build: (props) => `/articles/${(props as ArticleProps).id}`,
};

function StackInspector() {
  const state = useStackState();
  return (
    <ul style={{ fontFamily: 'monospace', fontSize: 12, padding: '8px 16px' }}>
      {state.stack.length === 0 && <li style={{ opacity: 0.4 }}>(empty)</li>}
      {state.stack.map((layer) => (
        <li key={layer.id}>
          {layer.id}
          <span style={{ opacity: 0.4 }}>
            {' · '}
            {layer.flavor ?? 'ephemeral'}
            {' · '}
            {layer.phase}
          </span>
        </li>
      ))}
    </ul>
  );
}

function URLBadge() {
  const [pathname, setPathname] = useState(
    typeof window === 'undefined' ? '/' : window.location.pathname,
  );
  React.useEffect(() => {
    const onChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onChange);
    // Poll once per tick — replaceState doesn't fire events.
    const id = setInterval(onChange, 200);
    return () => {
      window.removeEventListener('popstate', onChange);
      clearInterval(id);
    };
  }, []);
  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '6px 12px',
        background: '#f4f4f4',
        borderRadius: 4,
        display: 'inline-block',
      }}
    >
      URL: <strong>{pathname}</strong>
    </div>
  );
}

function Controls() {
  const store = useStack();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        onClick={() => store.push({ kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' })}
      >
        Open article a1
      </button>
      <button
        onClick={() => store.push({ kind: 'article', props: { id: 'a2' }, flavor: 'route-bound' })}
      >
        Open article a2
      </button>
      <button onClick={() => store.push({ kind: 'confirm-delete', flavor: 'ephemeral' })}>
        Open ephemeral
      </button>
      <button onClick={() => window.history.back()}>← Back</button>
      <button onClick={() => window.history.forward()}>Forward →</button>
    </div>
  );
}

function Demo() {
  const adapter = useMemo(() => historyAdapter({ routes: [articleRoute] }), []);
  const store = useMemo(() => createStackStore({ mountWindow: 3, router: adapter }), [adapter]);

  return (
    <StackProvider value={store}>
      <div style={{ padding: 24, maxWidth: 720 }}>
        <h3>Generic historyAdapter with a route table</h3>
        <p style={{ fontSize: 14, color: '#555' }}>
          Route-bound pushes change the URL via <code>build(props)</code>. Ephemerals do not.
          Browser-Back unwinds the stack one entry at a time.
        </p>
        <div style={{ marginTop: 12 }}>
          <URLBadge />
        </div>
        <div style={{ marginTop: 16 }}>
          <Controls />
        </div>
        <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
          <strong>Stack state:</strong>
          <StackInspector />
        </div>
      </div>
    </StackProvider>
  );
}

export const Basic: StoryObj = { render: () => <Demo /> };
