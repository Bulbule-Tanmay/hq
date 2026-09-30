'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UI } from '../../components/icons';

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not sign in.');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit} noValidate>
        <span className="page-icon"><UI.Lock size={24} /></span>
        <h1>Tanmay HQ</h1>
        <p className="lede">Enter your password to open the dashboard.</p>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Checking' : 'Open dashboard'}</button>
      </form>
    </main>
  );
}
