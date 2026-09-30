import { NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(req) {
  try {
    const { key, value } = await req.json();
    if (typeof key !== 'string' || !key) {
      return NextResponse.json({ error: 'Missing key.' }, { status: 400 });
    }
    const { error } = await db()
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Database error.' }, { status: 500 });
  }
}
