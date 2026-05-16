'use client';

// Intercepted modal route (ADR 0002, issue #7).
//
// Clicking `<Link href="/articles/[id]">` from the feed lands here instead
// of navigating away. `useLayerRoute` declares the route-bound layer; the
// Stage (mounted by `providers.tsx`) renders the vaul drawer via the
// registry. This component itself renders nothing — its only job is to be
// the lifecycle owner of the route-bound layer.
import { use } from 'react';

import { useLayerRoute } from '@gwn-sheet-stack/react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InterceptedArticlePage({ params }: PageProps) {
  const { id } = use(params);
  useLayerRoute('article-detail', { articleId: id });
  return null;
}
