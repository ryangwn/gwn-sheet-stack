import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'sheet-stack · Next.js 16 demo',
  description: 'Article feed wired through @gwn-sheet-stack/adapters-router-next.',
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          {modal}
        </Providers>
      </body>
    </html>
  );
}
