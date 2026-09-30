import { DOB } from './modules';

/* ───────── dates */
const pad = (n) => String(n).padStart(2, '0');
export const toLocalDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toLocalDate(new Date());
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
export const entryDate = (e) => e.data?.date || toLocalDate(new Date(e.created_at));

export const shortDate = (s) =>
  s ? parseDate(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

export function agoText(iso) {
  if (!iso) return 'never';
  const diff = daysBetween(toLocalDate(new Date(iso)), todayStr());
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${diff} days ago`;
}

export function ageFromDob() {
  const t = new Date();
  const b = parseDate(DOB);
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age -= 1;
  return age;
}

/* ───────── matching */
export function matchWhere(e, where) {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    const val = e.data?.[k];
    if (Array.isArray(v)) return v.includes(val);
    if (v && typeof v === 'object' && 'not' in v) return !v.not.includes(val);
    return val === v;
  });
}

export function inPeriod(e, period) {
  if (!period || period === 'all') return true;
  const d = entryDate(e);
  const t = todayStr();
  if (period === 'today') return d === t;
  if (period === '7d') {
    const diff = daysBetween(d, t);
    return diff >= 0 && diff <= 6;
  }
  if (period === 'month') return d.slice(0, 7) === t.slice(0, 7);
  return true;
}

const isNum = (v) => v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v));

/* ───────── recurring routines */
const FREQ_DAYS = { Daily: 1, Weekly: 7, Fortnightly: 14, Monthly: 30 };

export function dueInfo(entry, mod) {
  const cfg = mod.recurring;
  if (!cfg) return null;
  const freq = FREQ_DAYS[entry.data?.[cfg.freqKey]] || 7;
  const last = entry.data?.[cfg.lastKey];
  if (!last) return { state: 'due', text: 'Never done' };
  const since = daysBetween(last, todayStr());
  if (since < freq) return { state: 'ok', text: since === 0 ? 'Done today' : `Done ${since} day${since === 1 ? '' : 's'} ago` };
  if (since === freq) return { state: 'due', text: 'Due today' };
  return { state: 'overdue', text: `Overdue by ${since - freq} day${since - freq === 1 ? '' : 's'}` };
}

/* ───────── KPIs */
export function computeKpi(kpi, list, mod) {
  const rows = list.filter((e) => matchWhere(e, kpi.where) && inPeriod(e, kpi.period));
  const nums = (key) => rows.map((e) => e.data?.[key]).filter(isNum).map(Number);
  switch (kpi.calc) {
    case 'count':
      return rows.length;
    case 'sum':
      return nums(kpi.key).reduce((a, b) => a + b, 0);
    case 'avg': {
      const n = nums(kpi.key);
      return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
    }
    case 'latest': {
      const sorted = rows
        .filter((e) => isNum(e.data?.[kpi.key]))
        .sort((a, b) => entryDate(b).localeCompare(entryDate(a)) || b.created_at.localeCompare(a.created_at));
      return sorted.length ? Number(sorted[0].data[kpi.key]) : null;
    }
    case 'ratio': {
      const n = nums(kpi.num).reduce((a, b) => a + b, 0);
      const d = nums(kpi.den).reduce((a, b) => a + b, 0);
      return d ? n / d : null;
    }
    case 'due':
      return rows.filter((e) => ['due', 'overdue'].includes(dueInfo(e, mod)?.state)).length;
    default:
      return null;
  }
}

export function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

export function formatValue(v, k = {}) {
  if (v === null || v === undefined) return '—';
  return `${k.prefix || ''}${fmtNum(v)}${k.unit ? ' ' + k.unit : ''}${k.suffix || ''}`;
}

export function moduleKpis(mod, list, settings) {
  return (mod.kpis || []).map((k, i) => {
    const override = settings?.targets?.[`${mod.slug}.${i}`];
    const target = override !== undefined && override !== null ? Number(override) : k.target;
    const value = computeKpi(k, list, mod);
    const hasTarget = target !== undefined && target !== null;
    return {
      ...k,
      i,
      target,
      value,
      text: formatValue(value, k),
      targetText: hasTarget ? formatValue(target, k) : null,
      warn: !!(k.lowerBetter && hasTarget && value !== null && value > target),
      pct: hasTarget && !k.lowerBetter && target > 0 && value !== null ? Math.min(1, value / target) : null,
    };
  });
}

/* ───────── chart series */
export function buildSeries(mod, list) {
  const m = mod.metric;
  if (!m) return [];
  const rows = list.filter((e) => matchWhere(e, m.where));
  let pts;
  if (m.agg) {
    const map = new Map();
    rows.forEach((e) => {
      const d = entryDate(e);
      const add = m.agg === 'count' ? 1 : isNum(e.data?.[m.key]) ? Number(e.data[m.key]) : 0;
      if (m.agg === 'sum' && !isNum(e.data?.[m.key])) return;
      map.set(d, (map.get(d) || 0) + add);
    });
    pts = [...map.entries()].map(([x, y]) => ({ x, y }));
  } else {
    pts = rows
      .filter((e) => isNum(e.data?.[m.key]))
      .map((e) => ({ x: entryDate(e), y: Number(e.data[m.key]), t: e.created_at }));
  }
  pts.sort((a, b) => a.x.localeCompare(b.x) || (a.t || '').localeCompare(b.t || ''));
  return pts.slice(-30);
}

/* ───────── status tone */
const GOOD = ['Done', 'Won', 'Offer', 'Selected', 'Live', 'Deployed', 'Solved', 'Posted', 'Analysed', 'Ready', 'Sent to client', 'Shipped', 'Strong', 'Completed', 'Revised', 'Validating'];
const BAD = ['Rejected', 'Lost', 'Dead', 'Killed', 'Ghosted', 'Dropped', 'Stuck'];
const WARN = ['Follow up', 'Revisit', 'Paused', 'Parked'];
export function toneOf(v) {
  if (GOOD.includes(v)) return 'good';
  if (BAD.includes(v)) return 'bad';
  if (WARN.includes(v)) return 'warn';
  if (['In progress', 'Building', 'Interview', 'Applied', 'Learning', 'Practising', 'Working', 'Editing', 'Generating', 'Proposal', 'Call booked', 'Participating', 'Testing', 'Scripted', 'Contacted', 'Replied'].includes(v)) return 'live';
  return 'idle';
}

/* ───────── visibility */
export function isVisible(field, values) {
  if (!field.showWhen) return true;
  return Object.entries(field.showWhen).every(([k, v]) => (Array.isArray(v) ? v.includes(values[k]) : values[k] === v));
}

export function formatChip(field, value) {
  if (!field || value === undefined || value === null || value === '' || value === false) return null;
  if (field.type === 'number') {
    const n = `${field.prefix || ''}${fmtNum(Number(value))}${field.unit ? ' ' + field.unit : ''}`;
    return `${field.label} ${n}`;
  }
  if (field.type === 'date') return `${field.label} ${shortDate(value)}`;
  if (field.type === 'select' && field.key === 'quality') return `Quality ${value}`;
  return String(value);
}

export function entryTitle(mod, e) {
  const d = e.data || {};
  if (mod.titleFn) return mod.titleFn(d) || mod.name;
  if (mod.titleKey && d[mod.titleKey]) return d[mod.titleKey];
  return mod.name;
}

export function entrySub(mod, e) {
  const d = e.data || {};
  if (mod.subFn) return mod.subFn(d);
  return mod.subKey ? d[mod.subKey] || '' : '';
}

/* ───────── activity (ignores starter items until edited) */
export function touchedIn7Days(list) {
  return list.filter((e) => !e.data?._seed && daysBetween(toLocalDate(new Date(e.updated_at || e.created_at)), todayStr()) <= 6);
}
