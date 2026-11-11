import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="status-shell">
      <section className="empty-card stack gap-md">
        <div>
          <p className="eyebrow">Not found</p>
          <h1>That page or workspace doesn’t exist.</h1>
          <p>Check the link, switch to another organization, or head back to the main product page.</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" href="/">
            Return home
          </Link>
          <Link className="ghost-button" href="/docs/api">
            View API docs
          </Link>
        </div>
      </section>
    </main>
  );
}
