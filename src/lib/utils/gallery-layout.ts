// 📄 src/lib/utils/gallery-layout.ts
/**
 * Chi Sublime — Layout da galeria (sem buracos)
 * ============================================================
 *
 * O grid antigo usava spans fixos por imagem (tall/wide). Em 4
 * colunas encaixava; em 2 colunas (telemóvel) deixava células
 * vazias enormes. Aqui os spans são calculados a partir da POSIÇÃO
 * e do TOTAL, para cada breakpoint, garantindo linhas completas
 * seja qual for o número de imagens que o admin carregar.
 *
 * TELEMÓVEL/TABLET — 2 colunas, blocos de 3:
 *   [ larga ] [ 1 ][ 1 ]  [ larga ] [ 1 ][ 1 ] ...
 *   Resto 1 → última fica larga (já é o 1.º do bloco).
 *   Resto 2 → as duas últimas ficam lado a lado.
 *
 * DESKTOP (lg) — 4 colunas, blocos de 4 com espelho alternado:
 *   bloco par:   [grande 2x2][1][1]   bloco ímpar: [1][1][grande 2x2]
 *                [grande    ][ larga ]              [ larga ][grande    ]
 *   Resto 1 → faixa de 4 colunas; resto 2 → 2+2; resto 3 → 2+1+1.
 *
 * As classes são strings LITERAIS (o Tailwind v4 só gera classes
 * que encontra no código-fonte). O admin usa os spans numéricos
 * para desenhar a pré-visualização com estilos inline.
 */

export type GallerySpan = { col: number; row: number };

export type GalleryLayout = {
  mobile: GallerySpan[];
  desktop: GallerySpan[];
};

const S = (col: number, row: number): GallerySpan => ({ col, row });

function mobileSpans(count: number): GallerySpan[] {
  const spans = Array.from({ length: count }, (_, i) => (i % 3 === 0 ? S(2, 1) : S(1, 1)));
  // Resto 2: o primeiro do último bloco não pode ser largo (ficaria sozinho numa linha
  // e a imagem seguinte sozinha na outra)
  if (count % 3 === 2) spans[count - 2] = S(1, 1);
  return spans;
}

function desktopSpans(count: number): GallerySpan[] {
  const spans: GallerySpan[] = [];
  const fullBlocks = Math.floor(count / 4);

  for (let b = 0; b < fullBlocks; b++) {
    if (b % 2 === 0) spans.push(S(2, 2), S(1, 1), S(1, 1), S(2, 1));
    else spans.push(S(1, 1), S(1, 1), S(2, 2), S(2, 1));
  }

  const rest = count % 4;
  if (rest === 1) spans.push(S(4, 1));
  if (rest === 2) spans.push(S(2, 1), S(2, 1));
  if (rest === 3) spans.push(S(2, 1), S(1, 1), S(1, 1));

  return spans;
}

export function getGalleryLayout(count: number): GalleryLayout {
  const n = Math.max(0, Math.floor(count));
  return { mobile: mobileSpans(n), desktop: desktopSpans(n) };
}

const MOBILE_CLASSES: Record<string, string> = {
  '1x1': 'col-span-1 row-span-1',
  '2x1': 'col-span-2 row-span-1',
};

const DESKTOP_CLASSES: Record<string, string> = {
  '1x1': 'lg:col-span-1 lg:row-span-1',
  '2x1': 'lg:col-span-2 lg:row-span-1',
  '2x2': 'lg:col-span-2 lg:row-span-2',
  '4x1': 'lg:col-span-4 lg:row-span-1',
};

export function gallerySpanClasses(mobile: GallerySpan, desktop: GallerySpan): string {
  return [
    MOBILE_CLASSES[`${mobile.col}x${mobile.row}`] ?? MOBILE_CLASSES['1x1'],
    DESKTOP_CLASSES[`${desktop.col}x${desktop.row}`] ?? DESKTOP_CLASSES['1x1'],
  ].join(' ');
}
