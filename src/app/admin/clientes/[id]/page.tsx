// 📄 src/app/admin/clientes/[id]/page.tsx
import { redirect } from 'next/navigation';

export default function Page() {
  // A edição de clientes é feita num Drawer em /admin/clientes (sem página de detalhe).
  redirect('/admin/clientes');
}
