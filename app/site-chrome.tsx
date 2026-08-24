import Link from 'next/link';

export function SiteHeader({ active }: { active: 'plotter' | 'methodology' }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Half Life home">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span>HALF LIFE</span>
      </Link>
      <nav className="page-tabs" aria-label="Primary navigation">
        <Link className={active === 'plotter' ? 'active' : ''} href="/">Plotter</Link>
        <Link className={active === 'methodology' ? 'active' : ''} href="/methodology">Methodology</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span>HALF LIFE</span>
      </Link>
      <p>Educational visualization. Not medical advice.</p>
      <small>Made by Devin Kancherla</small>
    </footer>
  );
}
