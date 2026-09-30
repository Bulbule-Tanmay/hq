'use client';

import { useState } from 'react';
import { useStore } from './Store';

export default function KpiTile({ slug, kpi }) {
  const { settings, setSetting } = useStore();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const key = `${slug}.${kpi.i}`;
  const hasTarget = kpi.target !== undefined && kpi.target !== null;
  const word = kpi.lowerBetter ? 'limit' : 'goal';

  function save(e) {
    e.preventDefault();
    const n = Number(val);
    if (val === '' || Number.isNaN(n)) return setEditing(false);
    setSetting('targets', { ...(settings.targets || {}), [key]: n });
    setEditing(false);
  }

  return (
    <div className={`kpi ${kpi.warn ? 'kpi-warn' : ''}`}>
      <p className="kpi-label">{kpi.label}</p>
      <p className="kpi-value">{kpi.text}</p>
      {hasTarget ? (
        editing ? (
          <form onSubmit={save} className="kpi-edit">
            <input
              type="number"
              step="any"
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              aria-label={`New ${word} for ${kpi.label}`}
            />
            <button className="btn small primary" type="submit">Save</button>
          </form>
        ) : (
          <button
            type="button"
            className="kpi-target"
            onClick={() => { setVal(String(kpi.target)); setEditing(true); }}
            title={`Change the ${word}`}
          >
            {word} {kpi.targetText}
          </button>
        )
      ) : null}
      {kpi.pct !== null ? (
        <div className="bar" role="progressbar" aria-valuenow={Math.round(kpi.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${kpi.label} progress`}>
          <span style={{ width: `${kpi.pct * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
