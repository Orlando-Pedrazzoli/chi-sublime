// 📄 src/app/admin/clientes/novo/page.tsx
import { redirect } from 'next/navigation';

export default function Page() {
  // A criação de clientes é feita num Drawer em /admin/clientes.
  redirect('/admin/clientes');
}
