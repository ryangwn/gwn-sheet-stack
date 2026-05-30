'use client';

import React from 'react';

import Link from 'next/link';

import { ARTICLES } from './data';
import { FONT_SERIF, chip } from './tokens';

export function ArticleListScreen() {
  const [featured, ...rest] = ARTICLES;

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '24px 20px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#a8a29e',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 600,
            }}
          >
            Reader · Next.js 16 demo
          </div>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: -0.5,
              fontFamily: FONT_SERIF,
            }}
          >
            Sheet stack
          </h1>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
            color: '#7c2d12',
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
          }}
        >
          R
        </div>
      </header>

      <Link
        href={`/articles/${featured.id}`}
        style={{
          all: 'unset',
          cursor: 'pointer',
          borderRadius: 18,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ height: 168, background: featured.cover, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 14, left: 14 }}>
            <span
              style={{
                ...chip('#fff'),
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {featured.category}
            </span>
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: -0.2,
            }}
          >
            {featured.title}
          </div>
          <div style={{ fontSize: 13.5, color: '#57534e', marginTop: 8, lineHeight: 1.45 }}>
            {featured.excerpt}
          </div>
          <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 12 }}>
            {featured.author} · {featured.minutes} min read
          </div>
        </div>
      </Link>

      <div
        style={{
          fontSize: 11,
          color: '#a8a29e',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        More to read
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rest.map((a) => (
          <Link
            key={a.id}
            href={`/articles/${a.id}`}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              gap: 14,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                background: a.cover,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4,
                minWidth: 0,
              }}
            >
              <span style={chip(a.accent)}>{a.category}</span>
              <div
                style={{
                  fontFamily: FONT_SERIF,
                  fontSize: 17,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  letterSpacing: -0.1,
                }}
              >
                {a.title}
              </div>
              <div style={{ fontSize: 12, color: '#a8a29e' }}>
                {a.author} · {a.minutes} min
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
