'use client';

import React from 'react';

import { useLayer } from '@gwn-sheet-stack/react';
import * as Dialog from '@radix-ui/react-dialog';

import { useRadixDialog } from '../hooks/useRadixDialog';
import { usePortalContainer } from './PortalContainerContext';
import { articleById } from './data';
import { FONT_SANS, FONT_SERIF } from './tokens';

const DESTINATIONS: Array<{ label: string; glyph: string; bg: string; color: string }> = [
  { label: 'Copy link', glyph: '⧉', bg: '#f5f5f4', color: '#1c1917' },
  { label: 'Messages', glyph: '💬', bg: '#dcfce7', color: '#166534' },
  { label: 'Mail', glyph: '✉', bg: '#dbeafe', color: '#1e40af' },
  { label: 'Twitter', glyph: '𝕏', bg: '#0c0a09', color: '#fafaf9' },
  { label: 'Notes', glyph: '✎', bg: '#fef3c7', color: '#92400e' },
  { label: 'More', glyph: '···', bg: '#f5f5f4', color: '#57534e' },
];

export function ShareDialogLayer() {
  const radix = useRadixDialog();
  const layer = useLayer();
  const container = usePortalContainer();
  const articleId = (layer.props as { articleId: string }).articleId;
  const article = articleById(articleId);

  return (
    <Dialog.Root {...radix}>
      <Dialog.Portal container={container}>
        <style>{`
          @keyframes share-in  { from { opacity: 0; transform: translateY(-50%) scale(0.96); } to { opacity: 1; transform: translateY(-50%) scale(1); } }
          @keyframes share-out { from { opacity: 1; transform: translateY(-50%) scale(1); } to { opacity: 0; transform: translateY(-50%) scale(0.96); } }
          .share-dialog[data-state='open']   { animation: share-in  200ms cubic-bezier(0.16, 1, 0.3, 1); }
          .share-dialog[data-state='closed'] { animation: share-out 200ms cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
        <Dialog.Overlay
          className="radix-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12,10,9,0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
        <Dialog.Content
          className="share-dialog"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(420px, calc(100vw - 32px))',
            background: '#fafaf9',
            borderRadius: 22,
            padding: 22,
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            fontFamily: FONT_SANS,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: article.cover,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <Dialog.Title
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: FONT_SERIF,
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {article.title}
              </Dialog.Title>
              <Dialog.Description style={{ fontSize: 12, color: '#a8a29e', margin: '2px 0 0' }}>
                Share “{article.title}” by {article.author}.
              </Dialog.Description>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {DESTINATIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => layer.close()}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 4px',
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: d.bg,
                    color: d.color,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {d.glyph}
                </div>
                <span style={{ fontSize: 11.5, color: '#57534e' }}>{d.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => layer.close()}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'block',
              textAlign: 'center',
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              background: '#f5f5f4',
              fontSize: 14,
              fontWeight: 600,
              color: '#1c1917',
            }}
          >
            Cancel
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
