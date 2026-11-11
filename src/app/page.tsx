import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultOrganizationForUser } from "@/lib/tenant/service";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    const organization = await getDefaultOrganizationForUser(session.user.id);

    redirect(organization ? `/w/${organization.slug}` : "/onboarding");
  }

  return (
    <main className="marketing-shell">
      <section className="marketing-hero">
        <div className="marketing-copy">
          <p className="eyebrow">Project 1</p>
          <h1>Multi-tenant SaaS foundation with onboarding, teams, billing, API keys, and room to grow into a real product.</h1>
          <p>
            Booster gives each organization its own secure workspace, enforces role-based permissions across the app
            and API, and keeps billing, invites, audit trails, and project limits in one coherent system.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/register">
              Create workspace
            </Link>
            <Link className="ghost-button" href="/login">
              Sign in
            </Link>
          </div>
          <ul className="feature-list">
            <li>Logical multi-tenancy with path-based organization workspaces and subdomain-ready middleware</li>
            <li>Credentials plus GitHub and Google sign-in through Auth.js</li>
            <li>Stripe-compatible subscription flows, API keys, audit logs, and plan-based limits</li>
          </ul>
        </div>
        <div className="marketing-panel stack gap-lg">
          <div>
            <p className="eyebrow">Built for teams</p>
            <div className="pricing-grid">
              <article className="pricing-card">
                <span>Free</span>
                <strong>3 members</strong>
                <p>Starter footprint for lean internal teams or evaluation environments.</p>
              </article>
              <article className="pricing-card highlight">
                <span>Pro</span>
                <strong>25 members</strong>
                <p>Expanded project and collaboration limits for fast-moving product organizations.</p>
              </article>
              <article className="pricing-card">
                <span>Enterprise</span>
                <strong>Unlimited</strong>
                <p>Designed for multi-team operations that need scale, control, and billing flexibility.</p>
              </article>
            </div>
          </div>
          <div className="panel stack gap-md">
            <div className="section-header">
              <div>
                <p className="eyebrow">Core surfaces</p>
                <h2>What ships in this starter</h2>
              </div>
            </div>
            <ul className="check-list">
              <li>Marketing site, auth flow, persisted onboarding, and tenant dashboard</li>
              <li>Member invitations, role changes, ownership transfer, and audit logging</li>
              <li>Projects, public API docs, API key auth, billing checkout, and portal support</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
