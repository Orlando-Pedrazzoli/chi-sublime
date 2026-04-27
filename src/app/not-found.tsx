import Link from 'next/link';

/**
 * Página 404 global — quando uma rota não existe.
 * No Sprint 1 vamos estilizar com paleta Chi Sublime.
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '3rem', fontWeight: 300, color: '#1F3D2E' }}>404</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Página não encontrada</p>
      <Link
        href="/pt"
        style={{
          padding: '0.75rem 1.5rem',
          background: '#1F3D2E',
          color: '#FAF7F2',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        Voltar ao início
      </Link>
    </main>
  );
}
