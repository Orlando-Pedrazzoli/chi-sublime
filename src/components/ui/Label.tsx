// 📄 src/components/ui/Label.tsx
/**
 * Chi Sublime — Label (UI partilhado)
 * ⚠️ FIX bug Tailwind v4 + Next 16: margem e cores em INLINE
 * STYLE — labels coladas aos campos. API inalterada.
 */

import { cn } from '@/lib/utils/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function Label({ required, className, style, children, ...props }: LabelProps) {
  return (
    <label
      className={cn('block font-medium', className)}
      style={{
        marginBottom: '6px',
        fontSize: '14px',
        color: '#1a1a1a',
        ...style,
      }}
      {...props}
    >
      {children}
      {required && <span style={{ marginLeft: '2px', color: '#b23c3c' }}>*</span>}
    </label>
  );
}
