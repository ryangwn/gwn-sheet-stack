import React, { useMemo, useState } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { StackProvider, useLayerRoute, useStackState } from '@gwn-sheet-stack/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = { title: 'Hooks/useLayerRoute' };
export default meta;

// A "route file" component: while it is mounted, the stack must contain a
// route-bound Layer of (kind, props). Simulates `app/@modal/(.)articles/[id]/page.tsx`.
function ArticleRoute({ articleId }: { articleId: string }) {
  useLayerRoute('article', { articleId });
  return null;
}

function StackInspector() {
  const state = useStackState();
  return (
    <ul style={{ fontFamily: 'monospace', padding: '8px 16px' }}>
      {state.stack.length === 0 && <li style={{ opacity: 0.4 }}>(empty)</li>}
      {state.stack.map((layer) => (
        <li key={layer.id}>
          {layer.id}
          <span style={{ opacity: 0.4 }}> · {layer.phase}</span>
        </li>
      ))}
    </ul>
  );
}

function Demo() {
  const store = useMemo(() => createStackStore({ mountWindow: 3 }), []);
  const [mounted, setMounted] = useState<string[]>([]);

  return (
    <StackProvider value={store}>
      <div style={{ padding: 24, maxWidth: 600 }}>
        <h3>useLayerRoute</h3>
        <p style={{ fontSize: 14, color: '#555' }}>
          Toggle the route components below. Each one pushes a Layer on mount and pops it on unmount
          via <code>useLayerRoute</code>. Mounting the same article twice is a no-op —
          content-addressed ids dedupe.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {['a1', 'a2', 'a3'].map((id) => {
            const isMounted = mounted.includes(id);
            return (
              <button
                key={id}
                onClick={() =>
                  setMounted((prev) => (isMounted ? prev.filter((x) => x !== id) : [...prev, id]))
                }
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: isMounted ? '#222' : '#fff',
                  color: isMounted ? '#fff' : '#222',
                  cursor: 'pointer',
                }}
              >
                {isMounted ? '✓ ' : ''}
                Mount article {id}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
          <strong>Stack state:</strong>
          <StackInspector />
        </div>

        {mounted.map((id) => (
          <ArticleRoute key={id} articleId={id} />
        ))}
      </div>
    </StackProvider>
  );
}

export const Basic: StoryObj = { render: () => <Demo /> };
