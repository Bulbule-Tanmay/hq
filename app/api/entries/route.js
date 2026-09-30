import { NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

const fail = (err, status = 500) =>
  NextResponse.json({ error: err.message || 'Database error.' }, { status });

export async function POST(req) {
  try {
    const { module, data, items } = await req.json();
    if (typeof module !== 'string' || !module) return fail(new Error('Missing module.'), 400);
    const rows = (items || [data]).map((d) => ({ module, data: d || {} }));
    const { data: out, error } = await db().from('entries').insert(rows).select();
    if (error) throw error;
    return NextResponse.json({ rows: out });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req) {
  try {
    const { id, data } = await req.json();
    if (!id) return fail(new Error('Missing id.'), 400);
    const { data: out, error } = await db()
      .from('entries')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ row: out });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return fail(new Error('Missing id.'), 400);
    const { error } = await db().from('entries').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
