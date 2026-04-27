import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chi Sublime — Hair Style & Beauty | Cascais',
  description:
    'Salão de beleza premium em Quinta da Bicuda, Cascais. Cabelereiro, maquilhagem, sobrancelhas, unhas e depilação.',
};

/**
 * Root Layout — aplica-se a TODAS as páginas.
 * No Sprint 0 vamos adicionar fontes (Cormorant + Manrope) e design tokens.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
