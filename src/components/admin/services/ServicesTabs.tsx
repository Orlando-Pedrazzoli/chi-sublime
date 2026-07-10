// 📄 src/components/admin/services/ServicesTabs.tsx
'use client';

import { Tabs } from '@/components/ui/Tabs';
import { ServicesTable } from './ServicesTable';
import { CategoriesManager } from './CategoriesManager';

export function ServicesTabs() {
  return (
    <Tabs
      items={[
        { id: 'servicos', label: 'Serviços', content: <ServicesTable /> },
        { id: 'categorias', label: 'Categorias', content: <CategoriesManager /> },
      ]}
    />
  );
}
