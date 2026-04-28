import { redirect } from 'next/navigation';

/**
 * /servicos sem slug → redireciona para a homepage na secção de serviços.
 * Os links da homepage levam diretamente para /servicos/{slug}.
 */
export default function ServicosIndexPage() {
  redirect('/#services');
}
