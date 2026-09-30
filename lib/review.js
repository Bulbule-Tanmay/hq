// End of day review: quiz questions, scoring, and the contribution graph maths.
// Pure functions only, so they can be tested without React or a database.
import { GROUPS, BY_SLUG } from './modules';
import { entryDate, parseDate, toLocalDate, todayStr } from './engine';

export const REVIEW_MODULE = 'review';

/* ───────── answers */
export const ANSWERS = [
  { id: 'yes', label: 'Yes', score: 2 },
  { id: 'partly', label: 'Partly', score: 1 },
  { id: 'no', label: 'No', score: 0 },
  { id: 'skip', label: 'Not today', score: null },
];
const SCORE = Object.fromEntries(ANSWERS.map((a) => [a.id, a.score]));

/* ───────── one question per topic, in sidebar order */
const Q = {
  profile: 'Did you act on your principles today, and finish what you started instead of starting something new?',
  priorities: 'Did your hours go to your top priorities (GenAI internship, money, academics) and not drift elsewhere?',
  targets: 'Did you move at least one 90 day target forward today?',
  roadmap: 'Did you do something for your current career roadmap stage today?',
  academics: 'Did you attend, revise or finish something for college today?',
  gate: 'Did you study GATE today?',
  dsa: 'Did you solve your DSA problems for today?',
  skills: 'Did you practise or learn a skill from your skills matrix today?',
  projects: 'Did you make real progress on the project you are building?',
  internships: 'Did you apply, follow up or prepare for an internship today?',
  hackathons: 'Did you move a hackathon or club commitment forward today?',
  money: 'Did you log your spending and income today?',
  clients: 'Did you reach out to or follow up with a freelance lead today?',
  ugc: 'Did you move an AI UGC ad forward today?',
  products: 'Did you work on a digital product today?',
  ideas: 'Did you park new ideas in the Ideas list instead of acting on them?',
  investing: 'Did you stay disciplined with investing today, with no impulsive trades?',
  fitness: 'Did you work out or hit your movement target today?',
  nutrition: 'Did you eat close to your plan today, protein included?',
  appearance: 'Did you keep up your grooming and skincare routine today?',
  sleep: 'Did you keep to your bed and wake targets last night?',
  screen: 'Did you keep reels and screen time under your limit today?',
  chess: 'Did you play or study chess with intent today?',
  planner: 'Did you plan the day and finish your top 3 tasks?',
  social: 'Did you post, create or network on your platforms today?',
};

export const QUESTIONS = GROUPS.flatMap((g) =>
  g.slugs.map((slug) => ({ slug, group: g.id, groupName: g.name, topic: BY_SLUG[slug].name, text: Q[slug] }))
);

/* ───────── how much real data was logged today in a topic */
export function loggedToday(byModule, slug) {
  const t = todayStr();
  return (byModule[slug] || []).filter((e) => !e.data?._seed && entryDate(e) === t).length;
}

/* ───────── scoring */
export function scoreAnswers(answers) {
  const per = {};
  let points = 0;
  let answered = 0;
  QUESTIONS.forEach((q) => {
    const s = SCORE[answers[q.slug]];
    if (s === null || s === undefined) return;
    points += s;
    answered += 1;
    const g = (per[q.group] ||= { name: q.groupName, points: 0, answered: 0 });
    g.points += s;
    g.answered += 1;
  });
  const groups = Object.entries(per).map(([id, g]) => ({
    id,
    name: g.name,
    pct: Math.round((g.points / (g.answered * 2)) * 100),
    answered: g.answered,
  }));
  return { pct: answered ? Math.round((points / (answered * 2)) * 100) : null, answered, groups };
}

/* ───────── request body for the AI route */
export function buildAnalysisPayload({ answers, note, byModule, settings, reviews, date }) {
  const { pct } = scoreAnswers(answers);
  const label = Object.fromEntries(ANSWERS.map((a) => [a.id, a.label]));
  const history = reviews
    .filter((r) => r.data?.date && r.data.date !== date && typeof r.data.pct === 'number')
    .sort((a, b) => b.data.date.localeCompare(a.data.date))
    .slice(0, 14)
    .map((r) => ({ date: r.data.date, pct: r.data.pct }));
  return {
    date,
    pct,
    note: note || '',
    answers: QUESTIONS.map((q) => ({
      topic: q.topic,
      group: q.groupName,
      question: q.text,
      answer: label[answers[q.slug]] || 'Not today',
      loggedToday: loggedToday(byModule, q.slug),
    })),
    focus: (settings.focus || []).map((s) => BY_SLUG[s]?.name).filter(Boolean),
    history,
  };
}

/* ───────── contribution graph */
export function levelFromCount(n) {
  if (!n) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

export function levelFromPct(p) {
  if (p === undefined || p === null) return 0;
  if (p < 40) return 1;
  if (p < 60) return 2;
  if (p < 80) return 3;
  return 4;
}

// Entries per day, ignoring starter items that were never edited.
export function dayCounts(entries) {
  const map = {};
  entries.forEach((e) => {
    if (e.data?._seed) return;
    const d = entryDate(e);
    map[d] = (map[d] || 0) + 1;
  });
  return map;
}

export function reviewPcts(reviews) {
  const map = {};
  reviews.forEach((r) => {
    if (r.data?.date && typeof r.data.pct === 'number') map[r.data.date] = r.data.pct;
  });
  return map;
}

// Columns are weeks starting Sunday, like GitHub. Days after today are marked future.
export function buildWeeks(weekCount, today = todayStr()) {
  const t = parseDate(today);
  const lastSunday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
  const start = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - (weekCount - 1) * 7);
  const weeks = [];
  for (let w = 0; w < weekCount; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const date = toLocalDate(dt);
      days.push({ date, future: date > today, dow: d });
    }
    weeks.push(days);
  }
  return weeks;
}

const addDays = (s, n) => {
  const d = parseDate(s);
  return toLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

// A streak survives until the end of today, so an empty today does not break it yet.
export function streaks(values, weeks, today = todayStr()) {
  const all = weeks.flat().filter((d) => !d.future);
  let longest = 0;
  let run = 0;
  all.forEach((d) => {
    run = values[d.date] ? run + 1 : 0;
    longest = Math.max(longest, run);
  });
  let current = 0;
  let cursor = values[today] ? today : addDays(today, -1);
  while (values[cursor]) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const activeDays = all.filter((d) => values[d.date]).length;
  return { current, longest, activeDays };
}

export const monthLabels = (weeks) =>
  weeks.map((w, i) => {
    const m = parseDate(w[0].date).getMonth();
    const prev = i ? parseDate(weeks[i - 1][0].date).getMonth() : -1;
    return m !== prev ? parseDate(w[0].date).toLocaleDateString('en-IN', { month: 'short' }) : '';
  });
