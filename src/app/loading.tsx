export default function LoadingPage() {
  return (
    <main className="status-shell">
      <section className="empty-card">
        <p className="eyebrow">Loading</p>
        <h1>Preparing your workspace.</h1>
        <p>We are resolving tenant context, session state, and the latest plan limits.</p>
      </section>
    </main>
  );
}
