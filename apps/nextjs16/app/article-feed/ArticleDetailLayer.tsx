'use client';

import React from 'react';

import { useLayer, useStack } from '@gwn-sheet-stack/react';
import { Drawer } from 'vaul';

import { useVaulLayer } from '../hooks/useVaulLayer';
import { PillButton } from './PillButton';
import { usePortalContainer } from './PortalContainerContext';
import { articleById } from './data';
import { FONT_SANS, FONT_SERIF, chip, sheetSurface } from './tokens';

const fullScreenSurface: React.CSSProperties = {
  ...sheetSurface,
  top: 0,
  maxHeight: 'none',
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  paddingTop: 0,
};

const topBar: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px 10px',
  background: 'rgba(250, 250, 249, 0.85)',
  backdropFilter: 'saturate(180%) blur(12px)',
  WebkitBackdropFilter: 'saturate(180%) blur(12px)',
  borderBottom: '1px solid rgba(231, 229, 228, 0.6)',
  fontFamily: FONT_SANS,
};

const iconButton: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  width: 36,
  height: 36,
  borderRadius: 999,
  background: '#f5f5f4',
  color: '#1c1917',
  display: 'grid',
  placeItems: 'center',
};

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 3 L13 13 M13 3 L3 13" />
    </svg>
  );
}

export function ArticleDetailLayer() {
  const vaul = useVaulLayer();
  const layer = useLayer();
  const store = useStack();
  const { push } = store;
  const container = usePortalContainer();
  const articleId = (layer.props as { articleId: string }).articleId;
  const article = articleById(articleId);

  return (
    <Drawer.Root {...vaul} container={container}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.45)' }} />
        <Drawer.Content style={fullScreenSurface}>
          <div style={topBar}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#78716c', letterSpacing: 0.3 }}>
              {article.category}
            </span>
            <button onClick={() => layer.close()} style={iconButton} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0 24px 32px', flex: 1 }}>
            <div
              style={{
                height: 200,
                borderRadius: 14,
                background: article.cover,
                margin: '16px 0 18px',
              }}
            />
            <span style={chip(article.accent)}>{article.category}</span>
            <Drawer.Title
              style={{
                margin: '12px 0 8px',
                fontSize: 30,
                fontWeight: 700,
                fontFamily: FONT_SERIF,
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              {article.title}
            </Drawer.Title>
            <Drawer.Description style={{ fontSize: 13, color: '#78716c', margin: '0 0 18px' }}>
              By {article.author} · {article.minutes} min read
            </Drawer.Description>

            {article.body.split('\n\n').map((para, i) => (
              <p
                key={i}
                style={{
                  fontFamily: FONT_SERIF,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: '#1c1917',
                  margin: '0 0 14px',
                }}
              >
                {para}
              </p>
            ))}

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 20,
                paddingTop: 18,
                borderTop: '1px solid #e7e5e4',
              }}
            >
              <PillButton
                variant="primary"
                accent={article.accent}
                onClick={() => push({ kind: 'article-summary', props: { articleId } })}
              >
                ✨ Show summary
              </PillButton>
            </div>

            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#a8a29e',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Keep reading
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {article.related.map((rid) => {
                  const r = articleById(rid);
                  return (
                    <button
                      key={rid}
                      type="button"
                      onClick={() => {
                        // Always push forward — reading flow, no dedup. The
                        // same article can appear at multiple stack depths;
                        // back button walks one step at a time.
                        //
                        // URL sync via replaceState (not Next's router) so the
                        // parent intercepted route doesn't re-render and tear
                        // down the underlay. queueMicrotask defers past any
                        // sync replaceState `push()` emits via the adapter.
                        push({
                          kind: 'article-detail',
                          props: { articleId: rid },
                          dedup: false,
                        });
                        queueMicrotask(() => {
                          window.history.replaceState(window.history.state, '', `/articles/${rid}`);
                        });
                      }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: '#fff',
                        border: '1px solid #e7e5e4',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: r.cover,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: FONT_SERIF,
                            fontSize: 15,
                            fontWeight: 700,
                            lineHeight: 1.3,
                          }}
                        >
                          {r.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 2 }}>
                          {r.author} · {r.minutes} min
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
