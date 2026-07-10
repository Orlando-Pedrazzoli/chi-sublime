// 📄 src/components/ui/Accordion.tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type AccordionItem = {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
};

export type AccordionProps = {
  items: AccordionItem[];
  /** single: só uma aberta de cada vez; multiple: várias. */
  type?: 'single' | 'multiple';
  defaultOpen?: string[];
  className?: string;
};

export function Accordion({ items, type = 'single', defaultOpen = [], className }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const isOpen = prev.includes(id);
      if (type === 'single') return isOpen ? [] : [id];
      return isOpen ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  return (
    <div
      className={cn('divide-chi-border border-chi-border divide-y rounded-md border', className)}
    >
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium',
                'text-chi-charcoal hover:bg-chi-sand transition-colors disabled:opacity-40',
              )}
            >
              <span>{item.title}</span>
              <ChevronDown
                size={16}
                className={cn(
                  'text-chi-charcoal-soft shrink-0 transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
            {isOpen && (
              <div className="text-chi-charcoal-soft px-4 pb-4 text-sm">{item.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
