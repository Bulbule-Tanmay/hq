import { NextResponse } from 'next/server';
import { sessionToken, COOKIE } from './lib/session';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const ok = token && process.env.DASHBOARD_PASSWORD && token === (await sessionToken());
  if (ok) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
