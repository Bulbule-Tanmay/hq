import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="login">
      <div className="login-card">
        <h1>Page not found</h1>
        <p className="lede">That topic does not exist. Go back to the dashboard and pick one from the list.</p>
        <Link href="/" className="btn primary block">Back to home</Link>
      </div>
    </main>
  );
}
