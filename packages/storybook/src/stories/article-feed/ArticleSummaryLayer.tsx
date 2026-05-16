import React from 'react';

import { useLayer, useStack } from '@gwn-sheet-stack/react';
import { Drawer } from 'vaul';

import { useVaulLayer } from '../useVaulLayer';
import { PillButton } from './PillButton';
import { usePortalContainer } from './PortalContainerContext';
import { articleById } from './data';
import { FONT_SERIF, chip, grabber, sheetSurface } from './tokens';

export function ArticleSummaryLayer() {
  const vaul = useVaulLayer();
  const layer = useLayer();
  const { push } = useStack();
  const container = usePortalContainer();
  const articleId = (layer.props as { articleId: string }).articleId;
  const article = articleById(articleId);

  return (
    <Drawer.Root {...vaul} container={container}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,9,0.45)' }} />
        <Drawer.Content
          style={{
            ...sheetSurface,
            left: 16,
            right: 16,
            bottom: 16,
            maxHeight: '70vh',
            borderRadius: 20,
          }}
        >
          <div style={grabber} />
          <div style={{ overflowY: 'auto', padding: '0 24px 32px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={chip(article.accent)}>TL;DR</span>
              <span style={{ fontSize: 12, color: '#a8a29e' }}>· 30 sec</span>
            </div>
            <Drawer.Title
              style={{
                margin: '4px 0 18px',
                fontSize: 22,
                fontWeight: 700,
                fontFamily: FONT_SERIF,
                letterSpacing: -0.3,
                lineHeight: 1.2,
              }}
            >
              {article.title}
            </Drawer.Title>

            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {article.bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: `${article.accent}14`,
                      color: article.accent,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 15.5, lineHeight: 1.5, color: '#1c1917' }}>{b}</div>
                </li>
              ))}
            </ol>

            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <PillButton
                variant="primary"
                accent={article.accent}
                onClick={() => push({ kind: 'share-dialog', props: { articleId } })}
              >
                Share summary
              </PillButton>
              <PillButton variant="ghost" onClick={() => layer.close()}>
                Done
              </PillButton>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
