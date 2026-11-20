// 📄 src/lib/content/category-images.ts
/**
 * Chi Sublime — imagem de cabeçalho por categoria (por slug)
 * ============================================================
 *
 * Um único mapa para a home, a página de categoria, a página de
 * serviço e o índice /servicos. Inclui o slug antigo
 * ("cabelereiro") para o site não ficar sem imagem entre o deploy
 * e a correção do slug na base de dados.
 */

const CATEGORY_IMAGES: Record<string, string> = {
  cabeleireiro: '/images/services/detalhe6.jpg',
  cabelereiro: '/images/services/detalhe6.jpg',
  sobrancelhas: '/images/services/sobrancelhas.jpg',
  maquilhagem: '/images/services/maquilhagem.jpg',
  unhas: '/images/services/unhas.jpg',
  depilacao: '/images/services/depilacao.jpg',
};

const FALLBACK_IMAGE = '/images/hero.jpg';

export function categoryImage(slug: string): string {
  return CATEGORY_IMAGES[slug] ?? FALLBACK_IMAGE;
}
