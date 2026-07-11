// 📄 src/components/admin/transactions/ReceitasTabs.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { CheckoutModal } from '@/components/admin/checkout/CheckoutModal';
import { TransactionsTable } from './TransactionsTable';
import { CategoryManager } from './CategoryManager';

export function ReceitasTabs() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <>
      <Tabs
        items={[
          {
            id: 'receitas',
            label: 'Receitas',
            content: (
              <TransactionsTable
                type="income"
                reloadSignal={reload}
                headerAction={
                  <Button onClick={() => setCheckoutOpen(true)}>
                    <Plus size={16} />
                    Nova venda
                  </Button>
                }
              />
            ),
          },
          { id: 'categorias', label: 'Categorias', content: <CategoryManager kind="income" /> },
        ]}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onCompleted={() => setReload((r) => r + 1)}
      />
    </>
  );
}
