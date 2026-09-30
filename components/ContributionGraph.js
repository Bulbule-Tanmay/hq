'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { daysBetween, parseDate, todayStr } from '../lib/engine';
import {
  REVIEW_MODULE, buildWeeks, dayCounts, levelFromCount, levelFromPct, monthLabels, reviewPcts, streaks,
} from '../lib/review';
import { useStore } from './Store';

const WEEKS = 26;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const fmt = (s) => parseDate(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function ContributionGraph() {
  const { entries, byModule, status } = useStore();
  const [mode, setMode] = useState('activity');
  const [picked, setPicked] = useState(null);
  const scroller = useRef(null);
  const today = todayStr();

  const weeks = useMemo(() => buildWeeks(WEEKS, today), [today]);
  const months = useMemo(() => monthLabels(weeks), [weeks]);
  const counts = useMemo(() => dayCounts(entries), [entries]);
  const pcts = useMemo(() => reviewPcts(byModule[REVIEW_MODULE] || []), [byModule]);

  const review = mode === 'review';
  const present = useMemo(
    () => (review ? Object.fromEntries(Object.keys(pcts).map((d) => [d, 1])) : counts),
    [review, pcts, counts]
  );
  const stats = useMemo(() => streaks(present, weeks, today), [present, weeks, today]);
  const total = useMemo(
    () => weeks.flat().filter((d) => !d.future).reduce((a, d) => a + (review ? (pcts[d.date] !== undefined ? 1 : 0) : counts[d.date] || 0), 0),
    [weeks, review, pcts, counts]
  );

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [status]);

  const level = (date) => (review ? levelFromPct(pcts[date]) : levelFromCount(counts[date]));
  const describe = (date) => {
    if (review) return pcts[date] !== undefined ? `${fmt(date)}: review score ${pcts[date]}%` : `${fmt(date)}: no review`;
    const n = counts[date] || 0;
    return `${fmt(date)}: ${n} ${n === 1 ? 'entry' : 'entries'}`;
  };

  const noun = review ? 'reviews' : 'entries';
  const summary = `${total} ${noun} in the last ${WEEKS} weeks. Current streak ${stats.current} days, longest ${stats.longest} days.`;

  return (
    <div className="contrib">
      <div className="contrib-top">
        <div className="contrib-stats" aria-label="Streaks">
          <div><span className="contrib-num">{total}</span><span className="muted">{noun}, {WEEKS} weeks</span></div>
          <div><span className="contrib-num">{stats.current}</span><span className="muted">day streak</span></div>
          <div><span className="contrib-num">{stats.longest}</span><span className="muted">longest streak</span></div>
          <div><span className="contrib-num">{stats.activeDays}</span><span className="muted">active days</span></div>
        </div>
        <div className="filters" role="group" aria-label="Graph shows">
          <button type="button" className={`pill ${!review ? 'on' : ''}`} aria-pressed={!review} onClick={() => { setMode('activity'); setPicked(null); }}>Activity</button>
          <button type="button" className={`pill ${review ? 'on' : ''}`} aria-pressed={review} onClick={() => { setMode('review'); setPicked(null); }}>Daily review</button>
        </div>
      </div>

      <div className="contrib-scroll" ref={scroller}>
        <div className="contrib-wrap" role="img" aria-label={summary}>
          <div className="contrib-days" aria-hidden="true">
            {DAY_LABELS.map((l, i) => <span key={i}>{l}</span>)}
          </div>
          <div className="contrib-main">
            <div className="contrib-months" style={{ '--weeks': WEEKS }} aria-hidden="true">
              {months.map((m, i) => <span key={i}>{m}</span>)}
            </div>
            <div className="contrib-cells" aria-hidden="true">
              {weeks.flat().map((d) =>
                d.future ? (
                  <span key={d.date} className="cell future" />
                ) : (
                  <span
                    key={d.date}
                    className={`cell l${level(d.date)} ${d.date === today ? 'today' : ''} ${picked === d.date ? 'picked' : ''}`}
                    title={describe(d.date)}
                    onClick={() => setPicked(d.date)}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="contrib-foot">
        <p className="hint" role="status" aria-live="polite">
          {picked ? `${describe(picked)}${daysBetween(picked, today) === 0 ? ' (today)' : ''}` : 'Tap or hover a square to see that day.'}
        </p>
        <div className="legend" aria-hidden="true">
          <span className="muted">Less</span>
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cell l${l}`} />)}
          <span className="muted">More</span>
        </div>
      </div>
    </div>
  );
}
