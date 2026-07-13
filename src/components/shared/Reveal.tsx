// 📄 src/components/shared/Reveal.tsx
/**
 * Chi Sublime — Reveal
 * ============================================================
 *
 * Sistema único de animação on-scroll de todo o site público.
 * Fade + translateY subtil quando o elemento entra no viewport.
 *
 * - IntersectionObserver (dispara uma única vez)
 * - Delay opcional em segundos para pequenas orquestrações
 * - prefers-reduced-motion tratado no CSS (.reveal em globals.css)
 * - Client Component leve: pode envolver Server Components
 *   (recebe-os como children já renderizados)
 *
 * Uso:
 *   <Reveal><h2>Título</h2></Reveal>
 *   <Reveal delay={0.15} className="md:col-span-2">...</Reveal>
 */

'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type RevealProps = {
  children: ReactNode;
  /** Delay em segundos (ex.: 0.15) */
  delay?: number;
  className?: string;
  /** Elemento wrapper (default: div) */
  as?: 'div' | 'section' | 'span' | 'li' | 'article' | 'header' | 'figure';
};

export function Reveal({ children, delay = 0, className, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sem suporte a IO (browsers muito antigos): mostrar sempre
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties | undefined =
    delay > 0 ? ({ '--reveal-delay': `${delay}s` } as CSSProperties) : undefined;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      style={style}
      className={cn('reveal', visible && 'reveal-visible', className)}
    >
      {children}
    </Tag>
  );
}
