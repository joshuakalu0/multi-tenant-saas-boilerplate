import Link from "next/link";

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "unknown";

  return (
    <main className="status-shell">
      <section className="empty-card stack gap-md">
        <div>
          <p className="eyebrow">Authentication error</p>
          <h1>We couldn’t complete that sign-in flow.</h1>
          <p>
            Auth.js returned <code>{error}</code>. This usually means the provider credentials are missing, the
            callback URL is mismatched, or the user cancelled the handoff.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" href="/login">
            Try again
          </Link>
          <Link className="ghost-button" href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
