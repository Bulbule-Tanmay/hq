'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { todayStr } from '../lib/engine';
import {
  ANSWERS, QUESTIONS, REVIEW_MODULE, buildAnalysisPayload, loggedToday, scoreAnswers,
} from '../lib/review';
import { useStore } from './Store';
import { Icon, UI } from './icons';
import ContributionGraph from './ContributionGraph';

const TOTAL = QUESTIONS.length;
const tone = (p) => (p === null ? 'idle' : p >= 70 ? 'good' : p >= 40 ? 'warn' : 'bad');

function Analysis({ a }) {
  return (
    <div className="analysis">
      <p className="analysis-summary">{a.summary}</p>
      <div className="analysis-cols">
        {a.wins?.length ? (
          <div>
            <h3 className="analysis-h good-text">What worked</h3>
            <ul>{a.wins.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        ) : null}
        {a.gaps?.length ? (
          <div>
            <h3 className="analysis-h warn-text">What slipped</h3>
            <ul>{a.gaps.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        ) : null}
      </div>
      {a.pattern ? <p className="hint"><strong>Pattern:</strong> {a.pattern}</p> : null}
      {a.tomorrow?.length ? (
        <div>
          <h3 className="analysis-h">Tomorrow</h3>
          <ol className="analysis-next">{a.tomorrow.map((w, i) => <li key={i}>{w}</li>)}</ol>
        </div>
      ) : null}
    </div>
  );
}

export default function ReviewView() {
  const { status, error, load, byModule, settings, add, update } = useStore();
  const reviews = useMemo(() => byModule[REVIEW_MODULE] || [], [byModule]);
  const today = todayStr();
  const current = useMemo(() => reviews.find((r) => r.data?.date === today), [reviews, today]);

  const [stage, setStage] = useState('idle'); // idle | quiz | note | saving
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const headRef = useRef(null);

  useEffect(() => { headRef.current?.focus(); }, [stage]);

  const q = QUESTIONS[idx];
  const live = useMemo(() => scoreAnswers(answers), [answers]);

  const start = useCallback((prefill) => {
    setAnswers(prefill || {});
    setNote('');
    setIdx(0);
    setStage('quiz');
  }, []);

  const pick = useCallback((id) => {
    setAnswers((p) => ({ ...p, [QUESTIONS[idx].slug]: id }));
    if (idx + 1 >= TOTAL) setStage('note');
    else setIdx(idx + 1);
  }, [idx]);

  useEffect(() => {
    if (stage !== 'quiz') return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= ANSWERS.length) pick(ANSWERS[n - 1].id);
      else if (e.key === 'ArrowLeft' && idx > 0) setIdx(idx - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage, idx, pick]);

  async function analyze(id, data) {
    setAnalyzing(true);
    setAiError('');
    try {
      const body = buildAnalysisPayload({ answers: data.answers, note: data.note, byModule, settings, reviews, date: data.date });
      const res = await fetch('/api/review/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'AI analysis failed.');
      await update(id, { analysis: json.analysis, analyzedAt: new Date().toISOString() });
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function finish() {
    setStage('saving');
    const { pct, answered } = scoreAnswers(answers);
    const data = { date: today, pct, answered, answers, note: note.trim() };
    let id = current?.id;
    let ok;
    if (current) ok = await update(current.id, data, { replace: true });
    else {
      const rows = await add(REVIEW_MODULE, data);
      ok = !!rows;
      id = rows?.[0]?.id;
    }
    if (!ok) { setStage('note'); return; }
    setStage('idle');
    if (id) analyze(id, data);
  }

  if (status === 'loading') {
    return (
      <div className="page">
        <div className="skeleton-grid" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton kpi-sk" />)}
        </div>
      </div>
    );
  }

  const head = (
    <header className="page-head">
      <div className="page-title">
        <span className="page-icon"><Icon name="review" size={24} /></span>
        <div>
          <h1 tabIndex={-1} ref={headRef}>End of day review</h1>
          <p className="lede">A quick quiz across every topic, then an honest read of the day.</p>
        </div>
      </div>
    </header>
  );

  const errorBox = status === 'error' ? (
    <div className="notice bad" role="alert">
      <p>Could not load your data. {error}</p>
      <button className="btn small" onClick={load}><UI.Refresh size={16} /> Try again</button>
    </div>
  ) : null;

  /* ───── quiz */
  if (stage === 'quiz') {
    const hits = loggedToday(byModule, q.slug);
    return (
      <div className="page">
        {head}
        <section className="panel quiz" aria-labelledby="q-text">
          <div className="quiz-progress">
            <div className="bar" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={TOTAL} aria-label="Quiz progress">
              <span style={{ width: `${((idx + 1) / TOTAL) * 100}%` }} />
            </div>
            <span className="muted">Question {idx + 1} of {TOTAL}</span>
          </div>
          <p className="quiz-topic"><Icon name={q.slug} size={18} /> {q.topic} <span className="muted">· {q.groupName}</span></p>
          <h2 id="q-text" className="quiz-q">{q.text}</h2>
          <p className="hint">{hits ? `You logged ${hits} ${hits === 1 ? 'entry' : 'entries'} here today.` : 'Nothing logged here today.'}</p>
          <div className="quiz-options" role="group" aria-label="Your answer">
            {ANSWERS.map((a, i) => (
              <button key={a.id} type="button" className={`btn quiz-opt ${answers[q.slug] === a.id ? 'picked' : ''}`} aria-pressed={answers[q.slug] === a.id} onClick={() => pick(a.id)}>
                <kbd>{i + 1}</kbd> {a.label}
              </button>
            ))}
          </div>
          <div className="quiz-nav">
            <button type="button" className="btn ghost small" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Back</button>
            <span className="muted">Keys 1 to 4 answer, left arrow goes back.</span>
            <button type="button" className="btn ghost small" onClick={() => setStage('idle')}>Cancel</button>
          </div>
        </section>
      </div>
    );
  }

  /* ───── note */
  if (stage === 'note' || stage === 'saving') {
    const counts = ANSWERS.map((a) => [a.label, QUESTIONS.filter((x) => answers[x.slug] === a.id).length]);
    return (
      <div className="page">
        {head}
        <section className="panel" aria-labelledby="note-h">
          <h2 id="note-h" className="panel-title">Done. Anything else before the analysis?</h2>
          <p className="hint">{counts.map(([l, n]) => `${l} ${n}`).join(', ')}. Score so far: {live.pct === null ? 'nothing answered' : `${live.pct}%`}.</p>
          <div className="field">
            <label htmlFor="rv-note">Note for the coach (optional)</label>
            <textarea id="rv-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What got in the way, what you are unsure about, what you want advice on" />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn ghost" disabled={stage === 'saving'} onClick={() => { setIdx(TOTAL - 1); setStage('quiz'); }}>Back</button>
            <button type="button" className="btn primary" disabled={stage === 'saving'} onClick={finish}>{stage === 'saving' ? 'Saving' : 'Save and analyse'}</button>
          </div>
        </section>
      </div>
    );
  }

  /* ───── intro (no review yet today) */
  if (!current) {
    return (
      <div className="page">
        {head}
        {errorBox}
        <section className="empty">
          <span className="empty-icon"><Icon name="review" size={32} /></span>
          <h2>Review today</h2>
          <p>{TOTAL} short questions, one per topic. Answer Yes, Partly, No, or Not today to skip. It takes about two minutes, and Gemini then reads the day back to you.</p>
          <div className="empty-actions">
            <button type="button" className="btn primary" onClick={() => start()}>Start the quiz</button>
          </div>
        </section>
        <section className="panel" aria-labelledby="g-h">
          <h2 id="g-h" className="panel-title">Consistency</h2>
          <ContributionGraph />
        </section>
      </div>
    );
  }

  /* ───── result */
  const d = current.data;
  const score = scoreAnswers(d.answers || {});
  return (
    <div className="page">
      {head}
      {errorBox}
      <div className="kpis">
        <div className="kpi">
          <p className="kpi-label">Today’s score</p>
          <p className={`kpi-value ${tone(d.pct) === 'bad' ? 'bad-text' : ''}`}>{d.pct === null || d.pct === undefined ? '—' : `${d.pct}%`}</p>
          <div className="bar" role="progressbar" aria-valuenow={d.pct || 0} aria-valuemin={0} aria-valuemax={100} aria-label="Today’s score"><span style={{ width: `${d.pct || 0}%` }} /></div>
        </div>
        <div className="kpi">
          <p className="kpi-label">Topics answered</p>
          <p className="kpi-value">{d.answered ?? score.answered} of {TOTAL}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Reviews done</p>
          <p className="kpi-value">{reviews.length}</p>
        </div>
      </div>

      <section className="panel" aria-labelledby="ai-h">
        <div className="panel-head">
          <h2 id="ai-h" className="panel-title">Analysis</h2>
          <button type="button" className="btn small" disabled={analyzing} onClick={() => analyze(current.id, d)}>
            {analyzing ? 'Analysing' : d.analysis ? 'Run again' : 'Run analysis'}
          </button>
        </div>
        {analyzing ? <div className="skeleton analysis-sk" aria-busy="true" aria-label="Analysing your day" /> : null}
        {!analyzing && d.analysis ? <Analysis a={d.analysis} /> : null}
        {!analyzing && !d.analysis && !aiError ? <p className="hint">No analysis yet.</p> : null}
        {aiError ? (
          <div className="notice bad" role="alert"><p>{aiError} Your review is saved.</p></div>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="by-h">
        <h2 id="by-h" className="panel-title">By area</h2>
        <div className="pc">
          {score.groups.map((g) => (
            <div key={g.id} className="pc-row">
              <p className="pc-name">{g.name}</p>
              <div className="pc-bars"><div className="bar"><span style={{ width: `${g.pct}%` }} /></div></div>
              <p className="pc-num">{g.pct}% from {g.answered} {g.answered === 1 ? 'topic' : 'topics'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="g-h">
        <h2 id="g-h" className="panel-title">Consistency</h2>
        <ContributionGraph />
      </section>

      <div>
        <button type="button" className="btn" onClick={() => start(d.answers)}>Retake today’s quiz</button>
      </div>
    </div>
  );
}
