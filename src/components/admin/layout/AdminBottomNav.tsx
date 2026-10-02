// 📄 src/components/admin/layout/AdminBottomNav.tsx
'use client';

/**
 * Chi Sublime — AdminBottomNav (navegação mobile tipo app)
 * ============================================================
 *
 * Barra de separadores fixa no fundo do ecrã, só em mobile/tablet
 * (< lg). Em desktop a navegação continua na <AdminSidebar />.
 *
 *   [ Início ] [ Marcações ] [ Clientes ] [ Receitas ] [ Mais ]
 *
 * Boas práticas aplicadas:
 *  - 4 destinos do dia a dia + "Mais" (o resto vive numa folha que
 *    sobe do fundo — <AdminMoreSheet />), ícone + texto sempre visível.
 *  - Alvos de toque ≥ 60px de altura; `aria-current="page"` no ativo.
 *  - Respeita a safe-area do iPhone (barra do gesto "home") — precisa
 *    de `viewport-fit=cover`, definido em src/app/admin/layout.tsx.
 *  - Feedback instantâneo: o separador tocado acende no próprio toque,
 *    antes de o servidor responder (a navegação do App Router só troca
 *    o pathname quando a página nova está pronta).
 *  - Tocar no separador já ativo volta ao topo da página.
 *
 * ⚠️ Tailwind v4 + Next 16 descarta padding/cores em produção —
 * tudo o que é visualmente crítico vai em inline style.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { ArrowUpRight, LogOut, Menu } from 'lucide-react';
import {
  ADMIN_NAV_ITEMS,
  ADMIN_SHORTCUTS,
  getInitials,
  isAdminNavActive,
  type AdminNavItem,
} from './admin-nav';

type AdminUser = { name: string; email: string };

const GREEN = '#1F3D2E';
const GOLD = '#D4AF6E';
const INK = '#1A1A1A';
const MUTED = '#6B6B66';
const HAIRLINE = 'rgba(31,61,46,0.1)';

const TABS = ADMIN_NAV_ITEMS.filter((item) => item.tab);
const MORE_ITEMS = ADMIN_NAV_ITEMS.filter((item) => !item.tab);

export function AdminBottomNav({ user }: { user: AdminUser }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Separador tocado, à espera que a página nova chegue. Só conta
  // enquanto o pathname for o mesmo de quando se tocou — assim que a
  // navegação termina (ou é redirecionada) deixa de ter efeito.
  const [pendingNav, setPendingNav] = useState<{ href: string; from: string } | null>(null);
  const pendingHref = pendingNav && pendingNav.from === pathname ? pendingNav.href : null;

  const activeTab = TABS.find((tab) => isAdminNavActive(tab.href, pathname));
  // Fora dos 4 separadores (Despesas, Equipa, Caixa, …) → "Mais" fica ativo
  const moreActive = pendingHref === null && (moreOpen || !activeTab);

  // Estável (useCallback) — é dependência do efeito da folha
  const closeMore = useCallback(() => {
    setMoreOpen(false);
    moreButtonRef.current?.focus({ preventScroll: true });
  }, []);

  function handleTabClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Abrir noutro separador do browser: não mexer no estado
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    setMoreOpen(false);
    if (pathname === href) {
      // Já está nesta página → comportamento de app: voltar ao topo
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPendingNav({ href, from: pathname });
  }

  return (
    <>
      <nav
        aria-label="Navegação principal"
        data-admin-tabbar
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden print:hidden"
        style={{
          backgroundColor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'saturate(180%) blur(16px)',
          WebkitBackdropFilter: 'saturate(180%) blur(16px)',
          borderTop: `1px solid ${HAIRLINE}`,
          boxShadow: '0 -6px 24px rgba(31,61,46,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <ul
          className="mx-auto grid max-w-xl grid-cols-5"
          style={{ height: '60px', margin: '0 auto', padding: 0, listStyle: 'none' }}
        >
          {TABS.map((tab) => {
            const active =
              pendingHref !== null
                ? pendingHref === tab.href
                : !moreOpen && activeTab?.href === tab.href;
            return (
              <li key={tab.href} className="flex">
                <Link
                  href={tab.href}
                  aria-current={activeTab?.href === tab.href ? 'page' : undefined}
                  onClick={(e) => handleTabClick(e, tab.href)}
                  className="admin-tab flex flex-1 flex-col items-center justify-center"
                >
                  <TabVisual icon={tab.icon} label={tab.tabLabel ?? tab.label} active={active} />
                </Link>
              </li>
            );
          })}

          <li className="flex">
            <button
              ref={moreButtonRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="admin-more-sheet"
              onClick={() => setMoreOpen((open) => !open)}
              className="admin-tab flex flex-1 flex-col items-center justify-center"
            >
              <TabVisual icon={Menu} label="Mais" active={moreActive} />
            </button>
          </li>
        </ul>
      </nav>

      <AdminMoreSheet open={moreOpen} onClose={closeMore} user={user} pathname={pathname} />
    </>
  );
}

// ============================================================
// Separador (ícone numa "pílula" + texto)
// ============================================================

function TabVisual({
  icon: Icon,
  label,
  active,
}: {
  icon: AdminNavItem['icon'];
  label: string;
  active: boolean;
}) {
  return (
    <span
      className="flex flex-col items-center"
      style={{ color: active ? GREEN : MUTED, gap: '3px' }}
    >
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{
          width: '54px',
          height: '30px',
          borderRadius: '999px',
          backgroundColor: active ? 'rgba(212,175,110,0.26)' : 'transparent',
          transition: 'background-color 180ms ease',
        }}
      >
        <Icon size={21} strokeWidth={active ? 2 : 1.6} />
      </span>
      <span
        style={{
          fontSize: '11px',
          lineHeight: '13px',
          fontWeight: active ? 700 : 500,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
    </span>
  );
}

// ============================================================
// Folha "Mais" — restantes secções, atalhos e conta
// ============================================================

/** Arrastar a folha para baixo mais do que isto (px) fecha-a */
const DRAG_CLOSE_THRESHOLD = 90;

function AdminMoreSheet({
  open,
  onClose,
  user,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser;
  pathname: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragging = dragY > 0;

  // Enquanto aberta: Escape fecha, a página por trás não faz scroll,
  // e o foco entra na folha (leitores de ecrã / teclado).
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.href = '/';
  }

  // ── Arrastar para fechar (só pela pega/cabeçalho) ─────────────
  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  }
  function onDragEnd() {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    const shouldClose = dragY > DRAG_CLOSE_THRESHOLD;
    setDragY(0);
    if (shouldClose) onClose();
  }

  return (
    // Sempre no DOM (para a animação de fechar), mas `inert` + invisível
    // quando fechada: não recebe foco nem toques.
    <div
      className="fixed inset-0 z-50 lg:hidden print:hidden"
      inert={!open}
      style={{
        visibility: open ? 'visible' : 'hidden',
        transition: `visibility 0s linear ${open ? '0s' : '320ms'}`,
      }}
    >
      {/* Fundo escurecido — tocar fora fecha */}
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{
          backgroundColor: 'rgba(20,40,32,0.45)',
          opacity: open ? 1 : 0,
          transition: 'opacity 280ms ease',
          border: 0,
        }}
      />

      <div
        ref={panelRef}
        id="admin-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Mais secções"
        tabIndex={-1}
        className="admin-sheet absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col outline-none"
        style={{
          maxHeight: '88dvh',
          backgroundColor: '#FFFFFF',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -12px 40px rgba(20,40,32,0.18)',
          transform: open ? `translateY(${dragY}px)` : 'translateY(105%)',
          transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Pega + conta — zona de arrasto */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{ touchAction: 'none', padding: '10px 20px 14px' }}
        >
          <span
            aria-hidden
            className="mx-auto block"
            style={{
              width: '40px',
              height: '5px',
              borderRadius: '999px',
              backgroundColor: 'rgba(31,61,46,0.18)',
              margin: '0 auto 14px',
            }}
          />
          <div className="flex items-center" style={{ gap: '12px' }}>
            <span
              aria-hidden
              className="flex shrink-0 items-center justify-center font-serif"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '999px',
                backgroundColor: GREEN,
                color: GOLD,
                fontSize: '16px',
              }}
            >
              {getInitials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate font-serif"
                style={{ fontSize: '18px', lineHeight: '22px', color: INK }}
              >
                {user.name}
              </p>
              <p className="truncate" style={{ fontSize: '13px', color: MUTED }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          style={{
            overscrollBehavior: 'contain',
            padding: '4px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Restantes secções */}
          <ul
            className="grid grid-cols-3"
            style={{ gap: '10px', margin: 0, padding: 0, listStyle: 'none' }}
          >
            {MORE_ITEMS.map((item) => {
              const active = isAdminNavActive(item.href, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={onClose}
                    className="admin-press flex flex-col items-center justify-center text-center"
                    style={{
                      minHeight: '84px',
                      padding: '14px 6px 12px',
                      gap: '8px',
                      borderRadius: '16px',
                      backgroundColor: active ? 'rgba(212,175,110,0.2)' : '#FAF7F2',
                      border: `1px solid ${active ? 'rgba(184,146,74,0.55)' : 'transparent'}`,
                      color: GREEN,
                    }}
                  >
                    <Icon size={22} strokeWidth={1.6} />
                    <span
                      style={{
                        fontSize: '13px',
                        lineHeight: '16px',
                        fontWeight: active ? 700 : 500,
                        color: INK,
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Atalhos externos + terminar sessão */}
          <ul
            style={{
              margin: '16px 0 0',
              padding: 0,
              listStyle: 'none',
              borderRadius: '16px',
              border: `1px solid ${HAIRLINE}`,
              overflow: 'hidden',
            }}
          >
            {ADMIN_SHORTCUTS.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <li key={shortcut.href} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  <a
                    href={shortcut.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="admin-press flex items-center"
                    style={{ minHeight: '52px', padding: '0 16px', gap: '12px', color: INK }}
                  >
                    <Icon size={18} strokeWidth={1.6} style={{ color: GREEN }} />
                    <span className="flex-1" style={{ fontSize: '15px' }}>
                      {shortcut.label}
                    </span>
                    <ArrowUpRight size={16} strokeWidth={1.6} style={{ color: MUTED }} />
                  </a>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="admin-press flex w-full items-center text-left"
                style={{
                  minHeight: '52px',
                  padding: '0 16px',
                  gap: '12px',
                  color: '#B23C3C',
                  backgroundColor: 'transparent',
                  border: 0,
                }}
              >
                <LogOut size={18} strokeWidth={1.6} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>Terminar sessão</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
