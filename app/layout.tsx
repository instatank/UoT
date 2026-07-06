import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Truth Unites — geometry sandbox',
  description:
    'Architecture sandbox: one Pain → Parallels → Payoff → Practice session, three navigation geometries.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
