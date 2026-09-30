# Tanmay HQ

A personal dashboard with 25 topics built from your AboutMe file. Next.js on Vercel, Supabase for storage, one shared password to get in.

## What is inside

Home shows today's numbers, a Focus guard (pick up to 3 areas), quick add buttons, limit warnings, and all 25 topics as cards.

| Group | Topics |
|---|---|
| Direction | Profile and principles, Priorities, 90 day targets, Career roadmap |
| Study | Academics, GATE prep, DSA tracker, Skills matrix |
| Career | Projects and portfolio, Internship pipeline, Hackathons and clubs |
| Money | Money tracker, Freelance clients, AI UGC ads, Digital products, SaaS and startup ideas, Investing and trading |
| Body and mind | Fitness and body, Nutrition, Appearance and grooming, Sleep and discipline, Screen time, Chess |
| Daily and reach | Daily planner and review, Social and content |

Every topic page has the same shape: facts from your profile, KPI tiles, a chart where it makes sense, filters, and add, edit, delete. Empty topics offer starter items taken from your file (skills, GATE syllabus, roadmap stages, UGC clip slots and so on).

**End of day review** (sidebar, or the button on Home): a quiz with one question per topic (Yes, Partly, No, Not today), a score overall and by area, an AI analysis from Google Gemini, and a GitHub style contribution graph. The graph has two views: Activity (entries logged per day across every topic) and Daily review (your quiz score per day), with current and longest streaks. Reviews are stored as entries in the `review` module, so no schema change is needed. The AI analysis is optional: without `GEMINI_API_KEY` the review still saves and the page says the analysis is unavailable.

Details worth knowing:
- Click any status chip to move it to the next status.
- Click "goal" or "limit" under a KPI to change the number. It is saved to Supabase.
- Priorities compares your chosen weights with real hours. Add entries of type Hours.
- Sleep works out hours slept and whether you met the bed and wake targets from the two times you enter.
- Projects and Ideas warn you when more than one thing is in Building.
- After 9 PM Home nudges you if today's review is missing.

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. Open SQL Editor, paste `supabase/schema.sql`, run it.
3. Open Project Settings, then API. Copy the Project URL and the `service_role` key.

### 2. Run locally
```bash
cp .env.example .env.local     # fill in the four required values
npm install
npm run dev                    # http://localhost:3000
```

### 3. Optional: AI analysis
Create a key in Google AI Studio (aistudio.google.com/apikey) and set `GEMINI_API_KEY`. The model defaults to `gemini-2.5-flash`; set `GEMINI_MODEL` to change it. The key stays on the server, and the quiz answers for the day are sent to Google when you run an analysis.

### 4. Deploy on Vercel
1. Push this folder to a GitHub repository.
2. In Vercel choose Add New Project and import the repository.
3. Under Environment Variables add:
   - `DASHBOARD_PASSWORD` : the password you type to enter
   - `SESSION_SECRET` : any random string of 40+ characters
   - `SUPABASE_URL` : your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` : the service_role key
   - `GEMINI_API_KEY` : optional, for the AI analysis
4. Deploy.

To change the password later, edit `DASHBOARD_PASSWORD` in Vercel and redeploy. Every old session stops working.

## How the security works
- The browser never talks to Supabase. All reads and writes go through this app's API routes.
- Middleware blocks every page and API route until the password cookie is valid (httpOnly, 30 days).
- The tables have row level security on with no policies, so even the public anon key can read nothing.
- The service role key stays on the server. Never add `NEXT_PUBLIC_` to any variable here.
- It is a single shared password, not accounts. Use a long one.

## Customising
All 25 topics are plain data in `lib/modules.js`: fields, KPIs, charts, filters and starter items. Add a field, change a default goal, or add a whole topic by editing that file. New topic needs an icon entry in `components/icons.js` and a slug in a group.

## Limits
- Data loads once per visit and is filtered in the browser. Fine for personal use, thousands of entries are no problem.
- Dates use the browser's local day.
