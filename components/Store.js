'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('You are signed out.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed.');
  return json;
}

export function StoreProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const timer = useRef();
  const entriesRef = useRef([]);
  entriesRef.current = entries;

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 4500);
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const json = await api('/api/data');
      setEntries(json.entries);
      setSettings(json.settings);
      setError('');
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addMany = useCallback(
    async (module, items) => {
      try {
        const json = await api('/api/entries', { method: 'POST', body: JSON.stringify({ module, items }) });
        entriesRef.current = [...json.rows, ...entriesRef.current];
        setEntries((prev) => [...json.rows, ...prev]);
        return json.rows;
      } catch (e) {
        flash(`Could not save. ${e.message}`);
        return false;
      }
    },
    [flash]
  );

  const add = useCallback((module, data) => addMany(module, [data]), [addMany]);

  const update = useCallback(
    async (id, patch, { replace = false } = {}) => {
      // Work out the new data here, not inside the state updater: React may run the
      // updater later, and the request below needs the value straight away.
      const previous = entriesRef.current.find((e) => e.id === id);
      if (!previous) return false;
      const next = { ...(replace ? {} : previous.data), ...patch };
      delete next._seed;
      const updated = { ...previous, data: next, updated_at: new Date().toISOString() };
      entriesRef.current = entriesRef.current.map((e) => (e.id === id ? updated : e));
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      try {
        await api('/api/entries', { method: 'PATCH', body: JSON.stringify({ id, data: next }) });
        return true;
      } catch (e) {
        entriesRef.current = entriesRef.current.map((x) => (x.id === id ? previous : x));
        setEntries((prev) => prev.map((x) => (x.id === id ? previous : x)));
        flash(`Could not update. ${e.message}`);
        return false;
      }
    },
    [flash]
  );

  const remove = useCallback(
    async (id) => {
      let previous;
      setEntries((prev) => {
        previous = prev;
        return prev.filter((e) => e.id !== id);
      });
      try {
        await api(`/api/entries?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch (e) {
        if (previous) setEntries(previous);
        flash(`Could not delete. ${e.message}`);
      }
    },
    [flash]
  );

  const setSetting = useCallback(
    async (key, value) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        await api('/api/settings', { method: 'PUT', body: JSON.stringify({ key, value }) });
      } catch (e) {
        flash(`Could not save setting. ${e.message}`);
      }
    },
    [flash]
  );

  const byModule = useMemo(() => {
    const map = {};
    entries.forEach((e) => (map[e.module] ||= []).push(e));
    return map;
  }, [entries]);

  const value = { entries, byModule, settings, status, error, toast, load, add, addMany, update, remove, setSetting };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
