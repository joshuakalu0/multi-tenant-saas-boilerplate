export default function ApiDocumentationPage() {
  return (
    <main className="docs-shell">
      <div className="docs-layout">
        <section className="panel stack gap-lg">
          <div>
            <p className="eyebrow">Public API</p>
            <h1>Tenant-aware REST endpoints for projects and API-key-based integrations.</h1>
            <p>
              The same Next.js application serves the product UI and the public API. Session auth works for in-app
              requests, while external clients can send <code>Authorization: Bearer &lt;api-key&gt;</code>.
            </p>
          </div>

          <section className="stack gap-md" id="auth">
            <h2>Authentication</h2>
            <p>Use either an authenticated browser session or a named API key created from the workspace API keys page.</p>
            <div className="code-card">
              <span>Example request</span>
              <code>{`curl -H "Authorization: Bearer pb_live_..." https://example.com/api/v1/organizations/acme/projects`}</code>
            </div>
          </section>

          <section className="stack gap-md" id="endpoints">
            <h2>Endpoints</h2>
            <ul className="timeline-list">
              <li>
                <strong>GET /api/v1/me</strong>
                <p>Return the current authenticated actor context.</p>
              </li>
              <li>
                <strong>GET /api/v1/organizations</strong>
                <p>Return organizations accessible to the current session user.</p>
              </li>
              <li>
                <strong>GET|POST /api/v1/organizations/[slug]/projects</strong>
                <p>List or create tenant-scoped projects.</p>
              </li>
              <li>
                <strong>GET|PATCH|DELETE /api/v1/projects/[id]</strong>
                <p>Manage a single project with tenant enforcement.</p>
              </li>
              <li>
                <strong>GET|POST /api/v1/organizations/[slug]/api-keys</strong>
                <p>List or mint named API keys. Raw keys are only shown once.</p>
              </li>
              <li>
                <strong>DELETE /api/v1/organizations/[slug]/api-keys/[keyId]</strong>
                <p>Revoke an API key without deleting the audit trail.</p>
              </li>
            </ul>
          </section>

          <section className="stack gap-md" id="examples">
            <h2>Examples</h2>
            <div className="code-card">
              <span>JavaScript</span>
              <code>{`await fetch("/api/v1/organizations/acme/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Website Revamp" }) });`}</code>
            </div>
            <div className="code-card">
              <span>Python</span>
              <code>{`requests.get("https://example.com/api/v1/me", headers={"Authorization": "Bearer pb_live_..."})`}</code>
            </div>
          </section>
        </section>

        <aside className="panel docs-nav">
          <p className="eyebrow">On this page</p>
          <ul>
            <li><a href="#auth">Authentication</a></li>
            <li><a href="#endpoints">Endpoints</a></li>
            <li><a href="#examples">Examples</a></li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
