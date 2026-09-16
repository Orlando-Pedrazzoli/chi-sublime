// 📄 src/lib/utils/image.ts
/**
 * Chi Sublime — helpers de imagem
 * ============================================================
 *
 * O admin pode colar um URL manual no ImageUploadField ("usar URL").
 * O next/image só otimiza hosts listados em next.config.ts
 * (remotePatterns) e REBENTA a página com qualquer outro host.
 *
 * isOptimizableImage() devolve true para caminhos locais e hosts
 * configurados; para o resto usa-se `unoptimized` e a imagem é
 * servida tal como está, sem partir o render.
 */

const OPTIMIZABLE_HOSTS = new Set(['res.cloudinary.com', 'images.unsplash.com', 'picsum.photos']);

export function isOptimizableImage(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZABLE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
