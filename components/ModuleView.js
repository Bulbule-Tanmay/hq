'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BY_SLUG } from '../lib/modules';
import {
  agoText, ageFromDob, buildSeries, daysBetween, dueInfo, entryDate, entrySub, entryTitle,
  formatChip, fmtNum, moduleKpis, todayStr, toneOf, matchWhere, inPeriod,
} from '../lib/engine';
import { useStore } from './Store';
import { Icon, UI } from './icons';
import KpiTile from './KpiTile';
import Chart from './Chart';
import EntryDialog from './EntryDialog';

function sortList(mod, list) {
  const arr = [...list];
  const s = mod.sort;
  if (s) {
    arr.sort((a, b) => {
      const x = a.data?.[s.key];
      const y = b.data?.[s.key];
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
      return s.dir === 'desc' ? -c : c;
    });
    return arr;
  }
  arr.sort((a, b) => entryDate(b).localeCompare(entryDate(a)) || b.created_at.localeCompare(a.created_at));
  return arr;
}

const href = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function Row({ mod, e, onEdit }) {
  const { update, remove } = useStore();
  const [confirm, setConfirm] = useState(false);
  const d = e.data || {};
  const statusField = mod.statusKey ? mod.fields.find((f) => f.key === mod.statusKey) : null;
  const status = statusField ? d[statusField.key] : null;
  const title = entryTitle(mod, e);
  const sub = entrySub(mod, e);
  const due = dueInfo(e, mod);
  const chips = (mod.chips || [])
    .map((k) => formatChip(mod.fields.find((f) => f.key === k), d[k]))
    .filter(Boolean);
  const flags = (mod.flags || []).filter((f) => d[f.key] === true);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  const cycle = () => {
    const opts = statusField.options;
    const next = opts[(opts.indexOf(status) + 1) % opts.length];
    update(e.id, { [statusField.key]: next });
  };

  let pct = null;
  let progressText = '';
  if (mod.progress) {
    const cur = Number(d[mod.progress.cur] || 0);
    const tgt = Number(d[mod.progress.tgt] || 0);
    if (tgt > 0) {
      pct = Math.min(1, cur / tgt);
      progressText = `${fmtNum(cur)} of ${fmtNum(tgt)}${d[mod.progress.unitKey] ? ' ' + d[mod.progress.unitKey] : ''}`;
    }
  }

  return (
    <li className={`row ${mod.doneKey && d[mod.doneKey] ? 'row-done' : ''}`}>
      {mod.numberKey ? <span className="step">{d[mod.numberKey]}</span> : null}
      {mod.doneKey && d.kind !== 'Review' ? (
        <input
          type="checkbox"
          className="tick"
          checked={!!d[mod.doneKey]}
          onChange={() => update(e.id, { [mod.doneKey]: !d[mod.doneKey] })}
          aria-label={`Mark ${title} as done`}
        />
      ) : null}
      <div className="row-main">
        <p className="row-title">{title}</p>
        {sub ? <p className="row-sub">{sub}</p> : null}
        {pct !== null ? (
          <div className="row-progress">
            <div className="bar" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} progress`}>
              <span style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="muted">{progressText}</span>
          </div>
        ) : null}
        <div className="chips">
          {status ? (
            <button type="button" className={`chip chip-btn tone-${toneOf(status)}`} onClick={cycle} title="Click to move to the next status">
              <i className="dot" />
              {status}
            </button>
          ) : null}
          {due ? <span className={`chip tone-${due.state === 'ok' ? 'good' : due.state === 'due' ? 'warn' : 'bad'}`}><i className="dot" />{due.text}</span> : null}
          {flags.map((f) => <span key={f.key} className="chip tone-good"><i className="dot" />{f.label}</span>)}
          {chips.map((c, i) => <span key={i} className="chip">{c}</span>)}
        </div>
      </div>
      <div className="row-actions">
        {due && due.state !== 'ok' ? (
          <button type="button" className="btn small" onClick={() => update(e.id, { [mod.recurring.lastKey]: todayStr() })}>Mark done</button>
        ) : null}
        {(mod.links || []).map((k) =>
          d[k] ? (
            <a key={k} className="icon-btn" href={href(d[k])} target="_blank" rel="noreferrer noopener" aria-label={`Open ${title}`}>
              <UI.Open size={18} />
            </a>
          ) : null
        )}
        <button type="button" className="icon-btn" onClick={() => onEdit(e)} aria-label={`Edit ${title}`}>
          <UI.Pencil size={18} />
        </button>
        <button
          type="button"
          className={`icon-btn ${confirm ? 'danger' : ''}`}
          onClick={() => (confirm ? remove(e.id) : setConfirm(true))}
          aria-label={confirm ? `Confirm delete ${title}` : `Delete ${title}`}
        >
          {confirm ? <span className="confirm-text">Delete?</span> : <UI.Trash size={18} />}
        </button>
      </div>
    </li>
  );
}

function PriorityCompare({ list }) {
  const stated = {};
  list.filter((e) => e.data?.kind === 'Weight').forEach((e) => (stated[e.data.area] = (stated[e.data.area] || 0) + Number(e.data.weight || 0)));
  const hours = {};
  list.filter((e) => e.data?.kind === 'Hours' && inPeriod(e, '7d')).forEach((e) => (hours[e.data.area] = (hours[e.data.area] || 0) + Number(e.data.hours || 0)));
  const totalStated = Object.values(stated).reduce((a, b) => a + b, 0) || 1;
  const totalHours = Object.values(hours).reduce((a, b) => a + b, 0);
  const areas = [...new Set([...Object.keys(stated), ...Object.keys(hours)])];
  if (!areas.length) return null;
  const rows = areas.map((a) => {
    const s = ((stated[a] || 0) / totalStated) * 100;
    const r = totalHours ? ((hours[a] || 0) / totalHours) * 100 : 0;
    return { a, s, r, gap: r - s };
  });
  const worst = totalHours ? [...rows].sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap))[0] : null;

  return (
    <section className="panel" aria-labelledby="pc-h">
      <h2 id="pc-h" className="panel-title">Chosen weight against real hours, last 7 days</h2>
      <div className="pc">
        {rows.map((r) => (
          <div key={r.a} className="pc-row">
            <p className="pc-name">{r.a}</p>
            <div className="pc-bars">
              <div className="bar"><span style={{ width: `${r.s}%` }} /></div>
              <div className="bar bar-alt"><span style={{ width: `${r.r}%` }} /></div>
            </div>
            <p className="pc-num">{fmtNum(r.s)}% chosen<br />{totalHours ? `${fmtNum(r.r)}% actual` : 'no hours yet'}</p>
          </div>
        ))}
      </div>
      <p className="hint">
        {worst
          ? `Biggest gap: ${worst.a} is ${fmtNum(worst.s)}% by choice and ${fmtNum(worst.r)}% in practice.`
          : 'Log hours by area to see where your week actually went. Add an entry with type Hours.'}
      </p>
    </section>
  );
}

export default function ModuleView({ slug }) {
  const mod = BY_SLUG[slug];
  const { status, error, load, byModule, settings, addMany } = useStore();
  const list = useMemo(() => byModule[slug] || [], [byModule, slug]);
  const [filter, setFilter] = useState('All');
  const [dialog, setDialog] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const headRef = useRef(null);

  useEffect(() => {
    setFilter('All');
    headRef.current?.focus();
  }, [slug]);

  const kpis = useMemo(() => moduleKpis(mod, list, settings), [mod, list, settings]);
  const series = useMemo(() => buildSeries(mod, list), [mod, list]);
  const filterField = mod.filterKey ? mod.fields.find((f) => f.key === mod.filterKey) : null;
  const shown = useMemo(() => {
    const base = filterField && filter !== 'All' ? list.filter((e) => e.data?.[filterField.key] === filter) : list;
    return sortList(mod, base);
  }, [list, filter, filterField, mod]);

  const groups = useMemo(() => {
    if (!mod.groupBy) return [{ name: null, rows: shown }];
    const field = mod.fields.find((f) => f.key === mod.groupBy);
    return field.options
      .map((o) => ({ name: o, rows: shown.filter((e) => e.data?.[mod.groupBy] === o) }))
      .filter((g) => g.rows.length);
  }, [shown, mod]);

  async function seed() {
    setSeeding(true);
    await addMany(mod.slug, mod.seeds.map((s) => ({ ...s, _seed: true })));
    setSeeding(false);
  }

  const m = mod.metric;
  let deadline = null;
  if (m?.deadline) {
    const left = daysBetween(todayStr(), m.deadline);
    deadline = left >= 0 ? `${left} days left until ${new Date(m.deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Deadline passed';
  }

  const loading = status === 'loading';

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <span className="page-icon"><Icon name={mod.icon} size={24} /></span>
          <div>
            <h1 tabIndex={-1} ref={headRef}>{mod.name}</h1>
            <p className="lede">{mod.blurb}</p>
          </div>
        </div>
        <button type="button" className="btn primary" onClick={() => setDialog({})} disabled={loading}>
          <UI.Plus size={18} weight="bold" /> Add {mod.entity}
        </button>
      </header>

      {mod.summary ? <p className="summary">{mod.summary}</p> : null}

      {mod.facts?.length ? (
        <dl className="facts">
          {mod.facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v === '@age' ? `${ageFromDob()}` : v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {status === 'error' ? (
        <div className="notice bad" role="alert">
          <p>Could not load your data. {error}</p>
          <button className="btn small" onClick={load}><UI.Refresh size={16} /> Try again</button>
        </div>
      ) : null}

      {loading ? (
        <div className="skeleton-grid" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton kpi-sk" />)}
        </div>
      ) : (
        <>
          {kpis.length ? (
            <div className="kpis">
              {kpis.map((k) => <KpiTile key={k.i} slug={slug} kpi={k} />)}
            </div>
          ) : null}

          {m && series.length ? (
            <section className="panel" aria-labelledby="chart-h">
              <div className="panel-head">
                <h2 id="chart-h" className="panel-title">{m.label}</h2>
                {deadline ? <span className="muted">{deadline}</span> : null}
              </div>
              <Chart points={series} target={m.target} lowerBetter={m.lowerBetter} type={m.type || 'line'} label={m.label} />
            </section>
          ) : null}

          {mod.extra === 'priorities' ? <PriorityCompare list={list} /> : null}

          {list.length > 0 && filterField ? (
            <div className="filters" role="group" aria-label={`Filter by ${filterField.label}`}>
              {['All', ...filterField.options].map((o) => {
                const n = o === 'All' ? list.length : list.filter((e) => e.data?.[filterField.key] === o).length;
                if (o !== 'All' && n === 0) return null;
                return (
                  <button key={o} type="button" className={`pill ${filter === o ? 'on' : ''}`} aria-pressed={filter === o} onClick={() => setFilter(o)}>
                    {o} <span className="count">{n}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {list.length === 0 && status !== 'error' ? (
            <div className="empty">
              <span className="empty-icon"><Icon name={mod.icon} size={32} /></span>
              <h2>Nothing in {mod.name.toLowerCase()} yet</h2>
              <p>
                {mod.seeds.length
                  ? `Start with ${mod.seeds.length} items taken from your profile. You can edit or delete any of them.`
                  : `Add your first ${mod.entity} to start tracking.`}
              </p>
              <div className="empty-actions">
                {mod.seeds.length ? (
                  <button className="btn primary" onClick={seed} disabled={seeding}>{seeding ? 'Loading' : `Load ${mod.seeds.length} starter items`}</button>
                ) : null}
                <button className={`btn ${mod.seeds.length ? '' : 'primary'}`} onClick={() => setDialog({})}>Add {mod.entity}</button>
              </div>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.name || 'all'} aria-label={g.name || 'Entries'}>
                {g.name ? <h2 className="group-title">{g.name} <span className="count">{g.rows.length}</span></h2> : null}
                <ul className="rows">
                  {g.rows.map((e) => <Row key={e.id} mod={mod} e={e} onEdit={(entry) => setDialog({ entry })} />)}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      {dialog ? <EntryDialog mod={mod} entry={dialog.entry} preset={dialog.preset} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
