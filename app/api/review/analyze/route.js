import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const str = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : '');
const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);

const SYSTEM = `You are a direct, practical accountability coach for Tanmay, a second year Computer Engineering student in Pune.
His goal: become a strong AI and GenAI engineer with income potential. His stated weights are GenAI internship 40%, making money 30%, academics 20%, fitness and health 10%.
His known risk is fragmentation: starting too many things and finishing too few. His rule is to choose fewer targets and finish them.
You receive his end of day quiz. Each answer is Yes, Partly, No or Not today, with how many entries he logged that day in that topic.
Be honest and specific. Name topics. Do not flatter, do not lecture, do not pad. Use plain words.
Point out mismatches, for example saying Yes to a topic while logging nothing for it, or spending effort on low weight areas while top weight areas got No.
Compare with the recent history when it is given. Treat the focus areas as the things that matter most this quarter.
Reply with JSON only, in exactly this shape:
{"summary": string (2 to 3 sentences on how the day went),
 "wins": string[] (1 to 3 items, specific),
 "gaps": string[] (1 to 3 items, specific, most important first),
 "pattern": string (one sentence on a pattern across days, or across topics if history is thin),
 "tomorrow": string[] (exactly 3 concrete actions, each doable in one sitting)}`;

function clean(out) {
  const arr = (v, n) => (Array.isArray(v) ? v.map((x) => str(x, 400)).filter(Boolean).slice(0, n) : []);
  return {
    summary: str(out.summary, 800),
    wins: arr(out.wins, 3),
    gaps: arr(out.gaps, 3),
    pattern: str(out.pattern, 400),
    tomorrow: arr(out.tomorrow, 3),
  };
}

export async function POST(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set on the server.' }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const payload = {
    date: str(body.date, 10),
    score_percent: typeof body.pct === 'number' ? body.pct : null,
    note_from_tanmay: str(body.note, 1000),
    focus_areas: list(body.focus, 3).map((s) => str(s, 80)),
    recent_days: list(body.history, 14).map((h) => ({ date: str(h?.date, 10), score_percent: Number(h?.pct) || 0 })),
    answers: list(body.answers, 40).map((a) => ({
      topic: str(a?.topic, 80),
      group: str(a?.group, 40),
      question: str(a?.question, 200),
      answer: str(a?.answer, 20),
      entries_logged_today: Number(a?.loggedToday) || 0,
    })),
  };
  if (!payload.answers.length) {
    return NextResponse.json({ error: 'No answers to analyse.' }, { status: 400 });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1500, responseMimeType: 'application/json' },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `Gemini returned ${res.status}.`;
      return NextResponse.json({ error: `AI analysis failed. ${msg}` }, { status: 502 });
    }
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) {
      const why = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason || 'empty response';
      return NextResponse.json({ error: `AI analysis failed. Gemini gave no answer (${why}).` }, { status: 502 });
    }
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/^```json\s*|```\s*$/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'AI analysis failed. The reply was not valid JSON.' }, { status: 502 });
    }
    return NextResponse.json({ analysis: clean(parsed), model: MODEL });
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'Gemini took too long to reply.' : err?.message || 'Could not reach Gemini.';
    return NextResponse.json({ error: `AI analysis failed. ${msg}` }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
