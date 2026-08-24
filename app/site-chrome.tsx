import Link from 'next/link';

export function SiteHeader({ active }: { active: 'plotter' | 'compounded' | 'methodology' }) {
  return (
    <header className="topbar">
      <nav className="page-tabs" aria-label="Primary navigation">
        <Link className={active === 'plotter' ? 'active' : ''} href="/">Plotter</Link>
        <Link className={active === 'compounded' ? 'active' : ''} href="/compounded">Compounded</Link>
        <Link className={active === 'methodology' ? 'active' : ''} href="/methodology">Methodology</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <p>Educational visualization. Not medical advice.</p>
    </footer>
  );
}
