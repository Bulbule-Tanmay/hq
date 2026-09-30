'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { GROUPS, MODULES, BY_SLUG } from '../lib/modules';
import { agoText, moduleKpis, touchedIn7Days } from '../lib/engine';
import { useStore } from './Store';
import { Icon, UI } from './icons';
import KpiTile from './KpiTile';
import EntryDialog from './EntryDialog';

const TODAY = [
  ['nutrition', 0, 'Protein today'],
  ['planner', 0, 'Tasks done today'],
  ['dsa', 2, 'DSA solved today'],
  ['sleep', 0, 'Last night’s sleep'],
  ['screen', 0, 'Reels today'],
];

const QUICK = [
  ['nutrition', 'Log a meal'],
  ['dsa', 'Log a DSA problem'],
  ['planner', 'Add a task'],
  ['sleep', 'Log sleep'],
  ['screen', 'Log screen time'],
  ['fitness', 'Log weight or workout'],
];

export default function HomeView() {
  const { status, error, load, byModule, settings, setSetting } = useStore();
  const [now, setNow] = useState(null);
  const [picking, setPicking] = useState(false);
  const [quick, setQuick] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const focus = settings.focus || [];
  const kp = useMemo(
    () => Object.fromEntries(MODULES.map((m) => [m.slug, moduleKpis(m, byModule[m.slug] || [], settings)])),
    [byModule, settings]
  );
  const touched = useMemo(
    () => Object.fromEntries(MODULES.map((m) => [m.slug, touchedIn7Days(byModule[m.slug] || []).length])),
    [byModule]
  );
  const lastTouch = useMemo(
    () =>
      Object.fromEntries(
        MODULES.map((m) => {
          const real = (byModule[m.slug] || []).filter((e) => !e.data?._seed).map((e) => e.updated_at || e.created_at).sort();
          return [m.slug, real.length ? real[real.length - 1] : null];
        })
      ),
    [byModule]
  );

  const total7 = Object.values(touched).reduce((a, b) => a + b, 0);
  const focus7 = focus.reduce((a, s) => a + (touched[s] || 0), 0);
  const active = MODULES.filter((m) => touched[m.slug] > 0).length;
  const share = total7 ? Math.round((focus7 / total7) * 100) : null;

  const warnings = MODULES.flatMap((m) =>
    kp[m.slug].filter((k) => k.warn).map((k) => ({ slug: m.slug, text: `${m.name}: ${k.label} is ${k.text}, over the limit of ${k.targetText}.` }))
  );

  const reviewDone = (byModule.planner || []).some((e) => e.data?.kind === 'Review' && e.data?.date === now?.toLocaleDateString('en-CA'));
  const reviewDue = status === 'ready' && now && now.getHours() >= 21 && !reviewDone;

  const hour = now?.getHours();
  const greeting = hour === undefined ? 'Welcome back' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateText = now ? now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '\u00A0';

  function toggleFocus(slug) {
    const next = focus.includes(slug) ? focus.filter((s) => s !== slug) : focus.length < 3 ? [...focus, slug] : focus;
    setSetting('focus', next);
  }

  const loading = status === 'loading';

  return (
    <div className="page">
      <header className="hero">
        <h1 className="hero-title">{greeting}, Tanmay</h1>
        <p className="lede">{dateText}</p>
      </header>

      {status === 'error' ? (
        <div className="notice bad" role="alert">
          <p>Could not load your data. {error}</p>
          <button className="btn small" onClick={load}><UI.Refresh size={16} /> Try again</button>
        </div>
      ) : null}

      {reviewDue ? (
        <Link href="/m/planner" className="notice warn">
          <p>Your end of day review is not logged yet. Take two minutes and score today.</p>
          <span className="btn small">Open review</span>
        </Link>
      ) : null}

      <section aria-labelledby="today-h">
        <h2 id="today-h" className="section-title">Today</h2>
        {loading ? (
          <div className="skeleton-grid" aria-busy="true" aria-label="Loading">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton kpi-sk" />)}
          </div>
        ) : (
          <div className="kpis">
            {TODAY.map(([slug, i, label]) => <KpiTile key={slug} slug={slug} kpi={{ ...kp[slug][i], label }} />)}
          </div>
        )}
        <div className="quick" role="group" aria-label="Quick add">
          {QUICK.map(([slug, label]) => (
            <button key={slug} type="button" className="btn" disabled={loading} onClick={() => setQuick(slug)}>
              <Icon name={BY_SLUG[slug].icon} size={16} /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel focus" aria-labelledby="focus-h">
        <div className="panel-head">
          <div>
            <h2 id="focus-h" className="section-title flush">Focus guard</h2>
            <p className="muted">Your biggest risk is fragmentation. Pick up to 3 areas for the next 90 days and park the rest.</p>
          </div>
          <button type="button" className="btn" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
            <UI.Focus size={16} /> {picking ? 'Done choosing' : 'Choose focus areas'}
          </button>
        </div>

        {picking ? (
          <div className="picker" role="group" aria-label="Choose up to 3 focus areas">
            {MODULES.map((m) => {
              const on = focus.includes(m.slug);
              const full = !on && focus.length >= 3;
              return (
                <button key={m.slug} type="button" className={`pill ${on ? 'on' : ''}`} aria-pressed={on} disabled={full} onClick={() => toggleFocus(m.slug)}>
                  {m.name}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="slots">
          {[0, 1, 2].map((i) => {
            const slug = focus[i];
            const m = slug && BY_SLUG[slug];
            if (!m) {
              return (
                <button key={i} type="button" className="slot empty-slot" onClick={() => setPicking(true)}>
                  <span className="muted">Empty slot</span>
                  <span>Choose a focus</span>
                </button>
              );
            }
            const k = kp[slug][m.headline || 0];
            return (
              <Link key={slug} href={`/m/${slug}`} className="slot">
                <span className="slot-top"><Icon name={m.icon} size={20} /> {m.name}</span>
                <span className="slot-value">{k ? k.text : '—'}</span>
                <span className="muted">{k ? k.label : ''}{k?.targetText ? `, ${k.lowerBetter ? 'limit' : 'goal'} ${k.targetText}` : ''}</span>
              </Link>
            );
          })}
        </div>

        {!loading ? (
          <p className="meter">
            You updated {active} of {MODULES.length} areas in the last 7 days.
            {share !== null && focus.length ? ` ${share}% of those updates went to your focus areas.` : ''}
            {share === null ? ' Log something today to start the count.' : ''}
          </p>
        ) : null}
      </section>

      {warnings.length ? (
        <section aria-labelledby="warn-h">
          <h2 id="warn-h" className="section-title">Over the limit</h2>
          <ul className="warnlist">
            {warnings.map((w, i) => (
              <li key={i}><Link href={`/m/${w.slug}`}><UI.Warning size={18} /> {w.text}</Link></li>
            ))}
          </ul>
        </section>
      ) : null}

      {GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`g-${g.id}`}>
          <h2 id={`g-${g.id}`} className="section-title">{g.name}</h2>
          <div className="grid">
            {g.slugs.map((slug) => {
              const m = BY_SLUG[slug];
              const k = kp[slug][m.headline || 0];
              const count = (byModule[slug] || []).length;
              return (
                <Link key={slug} href={`/m/${slug}`} className={`card ${focus.includes(slug) ? 'card-focus' : ''}`}>
                  <span className="card-top">
                    <span className="card-icon"><Icon name={m.icon} size={20} /></span>
                    {focus.includes(slug) ? <span className="chip tone-live"><i className="dot" />Focus</span> : null}
                  </span>
                  <span className="card-name">{m.name}</span>
                  {loading ? (
                    <span className="skeleton line" />
                  ) : (
                    <>
                      <span className={`card-value ${k?.warn ? 'bad-text' : ''}`}>{k ? k.text : '—'}</span>
                      <span className="muted">{k ? k.label : ''}</span>
                    </>
                  )}
                  <span className="card-foot muted">
                    {loading ? '' : `${count} ${count === 1 ? 'entry' : 'entries'}, updated ${agoText(lastTouch[slug])}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {quick ? <EntryDialog mod={BY_SLUG[quick]} onClose={() => setQuick(null)} /> : null}
    </div>
  );
}
