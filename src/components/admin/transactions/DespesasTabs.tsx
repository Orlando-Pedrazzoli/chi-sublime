// 📄 src/components/admin/transactions/DespesasTabs.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { TransactionsTable } from './TransactionsTable';
import { ExpenseForm } from './ExpenseForm';
import { CategoryManager } from './CategoryManager';

export function DespesasTabs() {
  const [formOpen, setFormOpen] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <>
      <Tabs
        items={[
          {
            id: 'despesas',
            label: 'Despesas',
            content: (
              <TransactionsTable
                type="expense"
                reloadSignal={reload}
                headerAction={
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus size={16} />
                    Nova despesa
                  </Button>
                }
              />
            ),
          },
          { id: 'categorias', label: 'Categorias', content: <CategoryManager kind="expense" /> },
        ]}
      />
      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setReload((r) => r + 1)}
      />
    </>
  );
}
