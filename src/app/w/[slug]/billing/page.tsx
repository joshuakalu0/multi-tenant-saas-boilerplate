import { openBillingPortalAction, startCheckoutAction } from "@/app/actions";
import { getTenantContext } from "@/lib/tenant/context";
import { getPlanLimit } from "@/lib/plans";

export default async function WorkspaceBillingPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const context = await getTenantContext(slug);
  const canManage = context.membershipRole === "OWNER" || context.membershipRole === "ADMIN";

  return (
    <div className="stack gap-lg">
      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Billing</p>
            <h2>Plan, limits, and upgrade paths</h2>
          </div>
        </div>
        {query.success ? <p className="form-success">Stripe checkout completed. Refreshing subscription state now.</p> : null}
        {query.canceled ? <p className="helper-copy">Checkout was canceled before confirmation.</p> : null}
        {query.error ? <p className="form-error">We couldn’t open that billing flow.</p> : null}
        <div className="pricing-grid">
          <article className={context.organization.plan === "FREE" ? "pricing-card highlight" : "pricing-card"}>
            <span>Free</span>
            <strong>Starter</strong>
            <p>{getPlanLimit("FREE", "members")} members · {getPlanLimit("FREE", "projects")} projects</p>
          </article>
          <article className={context.organization.plan === "PRO" ? "pricing-card highlight" : "pricing-card"}>
            <span>Pro</span>
            <strong>Growth</strong>
            <p>{getPlanLimit("PRO", "members")} members · {getPlanLimit("PRO", "projects")} projects</p>
          </article>
          <article className={context.organization.plan === "ENTERPRISE" ? "pricing-card highlight" : "pricing-card"}>
            <span>Enterprise</span>
            <strong>Unlimited</strong>
            <p>No hard cap on members or projects in this starter.</p>
          </article>
        </div>
      </section>

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Current usage</p>
            <h2>Plan enforcement preview</h2>
          </div>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <span>Members in workspace</span>
            <strong>{context.usersCount}</strong>
          </article>
          <article className="stat-card">
            <span>Projects in workspace</span>
            <strong>{context.projectsCount}</strong>
          </article>
          <article className="stat-card">
            <span>Subscription status</span>
            <strong>{context.organization.subscriptionStatus}</strong>
          </article>
        </div>
        {canManage ? (
          <div className="hero-actions">
            <form action={startCheckoutAction.bind(null, slug, "PRO")}>
              <button className="primary-button" type="submit">
                Upgrade to Pro
              </button>
            </form>
            <form action={startCheckoutAction.bind(null, slug, "ENTERPRISE")}>
              <button className="secondary-button" type="submit">
                Upgrade to Enterprise
              </button>
            </form>
            <form action={openBillingPortalAction.bind(null, slug)}>
              <button className="ghost-button" type="submit">
                Manage billing
              </button>
            </form>
          </div>
        ) : (
          <p className="helper-copy">Only owners and admins can manage billing.</p>
        )}
      </section>
    </div>
  );
}
