'use client';

import { useEffect, useRef, useState } from 'react';
import { HOOKS } from '../lib/modules';
import { isVisible, todayStr } from '../lib/engine';
import { useStore } from './Store';
import { UI } from './icons';

function initialValues(mod, data) {
  const v = {};
  mod.fields.forEach((f) => {
    if (f.computed) return;
    if (data && data[f.key] !== undefined && data[f.key] !== null) v[f.key] = data[f.key];
    else if (f.type === 'check') v[f.key] = false;
    else if (f.type === 'select') v[f.key] = f.options[0];
    else if (f.default === 'today') v[f.key] = todayStr();
    else v[f.key] = f.default ?? '';
  });
  return v;
}

export default function EntryDialog({ mod, entry, preset, onClose }) {
  const { add, update } = useStore();
  const [values, setValues] = useState(() => initialValues(mod, entry?.data || preset));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const first = ref.current?.querySelector('input:not([type=checkbox]), select, textarea');
    first?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    const data = {};
    mod.fields.forEach((f) => {
      if (f.computed || !isVisible(f, values)) return;
      const raw = values[f.key];
      if (f.required && (raw === '' || raw === undefined || raw === null)) {
        errs[f.key] = `${f.label} is required.`;
        return;
      }
      if (f.type === 'check') data[f.key] = !!raw;
      else if (f.type === 'number') {
        if (raw === '' || raw === undefined) return;
        if (Number.isNaN(Number(raw))) errs[f.key] = 'Enter a number.';
        else data[f.key] = Number(raw);
      } else if (typeof raw === 'string') {
        if (raw.trim() !== '') data[f.key] = raw.trim();
      } else if (raw !== undefined) data[f.key] = raw;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const final = mod.beforeSave ? HOOKS[mod.beforeSave]({ ...data }) : data;
    setSaving(true);
    const ok = entry ? await update(entry.id, final, { replace: true }) : await add(mod.slug, final);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref}>
        <div className="dialog-head">
          <h2 id="dlg-title">{entry ? `Edit ${mod.entity}` : `Add ${mod.entity}`}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <UI.X size={20} />
          </button>
        </div>
        <form onSubmit={submit} noValidate className="form">
          {mod.fields
            .filter((f) => !f.computed && isVisible(f, values))
            .map((f) => {
              const id = `f-${f.key}`;
              const err = errors[f.key];
              return (
                <div key={f.key} className={`field ${f.type === 'check' ? 'field-check' : ''}`}>
                  {f.type === 'check' ? (
                    <label className="check-line">
                      <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
                      <span>{f.label}</span>
                    </label>
                  ) : (
                    <>
                      <label htmlFor={id}>
                        {f.label}
                        {f.unit ? <span className="muted"> ({f.unit})</span> : null}
                        {f.prefix && f.type === 'number' ? <span className="muted"> ({f.prefix})</span> : null}
                      </label>
                      {f.type === 'select' ? (
                        <select id={id} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                          {f.options.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea id={id} rows={3} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                      ) : (
                        <input
                          id={id}
                          type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : f.type}
                          step={f.type === 'number' ? 'any' : undefined}
                          inputMode={f.type === 'number' ? 'decimal' : undefined}
                          value={values[f.key]}
                          onChange={(e) => set(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          aria-invalid={!!err}
                        />
                      )}
                    </>
                  )}
                  {err ? <p className="error" role="alert">{err}</p> : null}
                </div>
              );
            })}
          <div className="dialog-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
