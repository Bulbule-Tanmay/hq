// Works in both the Edge runtime (middleware) and Node (route handlers).
export const COOKIE = 'hq_session';

export async function sessionToken() {
  const pw = process.env.DASHBOARD_PASSWORD || '';
  const secret = process.env.SESSION_SECRET || '';
  const data = new TextEncoder().encode(`${pw}::${secret}::tanmay-hq`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
