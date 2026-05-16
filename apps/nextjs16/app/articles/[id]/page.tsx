// Full-page fallback (ADR 0002, issue #7).
//
// Direct visits to `/articles/[id]` or refresh from a non-intercepted entry
// land on this server-rendered page. It mirrors the article content so a
// shared link is meaningful without any client-side stack reconstruction.
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { articleById } from '../../article-feed/data';
import { FONT_SANS, FONT_SERIF, chip } from '../../article-feed/tokens';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  let article;
  try {
    article = articleById(id);
  } catch {
    notFound();
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 24px 64px',
        fontFamily: FONT_SANS,
      }}
    >
      <Link href="/" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none' }}>
        ← Back to reader
      </Link>
      <div
        style={{
          height: 240,
          borderRadius: 16,
          background: article.cover,
          margin: '20px 0 18px',
        }}
      />
      <span style={chip(article.accent)}>{article.category}</span>
      <h1
        style={{
          fontSize: 34,
          fontWeight: 700,
          fontFamily: FONT_SERIF,
          letterSpacing: -0.4,
          lineHeight: 1.15,
          margin: '12px 0 6px',
        }}
      >
        {article.title}
      </h1>
      <div style={{ fontSize: 13, color: '#78716c', margin: '0 0 18px' }}>
        By {article.author} · {article.minutes} min read
      </div>
      {article.body.split('\n\n').map((para, i) => (
        <p
          key={i}
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 18,
            lineHeight: 1.6,
            color: '#1c1917',
            margin: '0 0 14px',
          }}
        >
          {para}
        </p>
      ))}
    </main>
  );
}
