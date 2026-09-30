'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GROUPS, BY_SLUG } from '../lib/modules';
import { useStore } from './Store';
import { Icon, UI } from './icons';

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault();
        setOpen(true);
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      mods: g.slugs.map((s) => BY_SLUG[s]).filter((m) => !needle || m.name.toLowerCase().includes(needle)),
    })).filter((g) => g.mods.length);
  }, [q]);

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to content</a>

      <header className="topbar">
        <Link href="/" className="brand">Tanmay HQ</Link>
        <button type="button" className="icon-btn" aria-expanded={open} aria-controls="side" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
          {open ? <UI.X size={22} /> : <UI.Menu size={22} />}
        </button>
      </header>

      <aside id="side" className={`side ${open ? 'open' : ''}`}>
        <Link href="/" className="brand brand-side">Tanmay HQ</Link>
        <div className="search">
          <UI.Search size={16} />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a topic, press /" aria-label="Find a topic" />
        </div>
        <nav aria-label="Topics">
          <Link href="/" className="nav-item" aria-current={pathname === '/' ? 'page' : undefined}>
            <UI.House size={18} /> Home
          </Link>
          {groups.map((g) => (
            <div key={g.id} className="nav-group">
              <p className="nav-heading">{g.name}</p>
              {g.mods.map((m) => {
                const href = `/m/${m.slug}`;
                return (
                  <Link key={m.slug} href={href} className="nav-item" aria-current={pathname === href ? 'page' : undefined}>
                    <Icon name={m.icon} size={18} /> {m.name}
                  </Link>
                );
              })}
            </div>
          ))}
          {!groups.length ? <p className="muted pad">No topic matches.</p> : null}
        </nav>
        <button type="button" className="nav-item logout" onClick={logout}>
          <UI.SignOut size={18} /> Lock dashboard
        </button>
      </aside>

      {open ? <button className="veil" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}

      <main id="main" className="main">
        {children}
      </main>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
