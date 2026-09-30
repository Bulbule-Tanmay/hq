import { NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = db();
    const entries = [];
    const page = 1000;
    for (let from = 0; from < 20000; from += page) {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + page - 1);
      if (error) throw error;
      entries.push(...data);
      if (data.length < page) break;
    }
    const { data: rows, error: sErr } = await supabase.from('settings').select('*');
    if (sErr) throw sErr;
    const settings = {};
    rows.forEach((r) => (settings[r.key] = r.value));
    return NextResponse.json({ entries, settings });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Could not reach the database.' },
      { status: 500 }
    );
  }
}
