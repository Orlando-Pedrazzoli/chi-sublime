// 📄 src/app/admin/servicos/categorias/page.tsx
import { redirect } from 'next/navigation';

export default function Page() {
  // As categorias de serviço vivem num separador em /admin/servicos.
  redirect('/admin/servicos');
}
