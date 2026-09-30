import { NextResponse } from 'next/server';
import { sessionToken, COOKIE } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const real = process.env.DASHBOARD_PASSWORD;
  if (!real) {
    return NextResponse.json(
      { error: 'DASHBOARD_PASSWORD is not set on the server.' },
      { status: 500 }
    );
  }
  if (typeof body.password !== 'string' || body.password !== real) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
