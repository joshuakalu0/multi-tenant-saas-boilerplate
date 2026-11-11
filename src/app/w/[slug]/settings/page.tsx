import { updateOrganizationSettingsAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getTenantContext } from "@/lib/tenant/context";

export default async function WorkspaceSettingsPage({
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
            <p className="eyebrow">Organization settings</p>
            <h2>Core tenant identity</h2>
          </div>
        </div>
        {query.saved ? <p className="form-success">Settings saved.</p> : null}
        {query.error ? <p className="form-error">We couldn’t update the organization settings.</p> : null}
        {canManage ? (
          <form action={updateOrganizationSettingsAction.bind(null, slug)} className="settings-form">
            <label className="field">
              <span>Organization name</span>
              <input defaultValue={context.organization.name} name="name" required type="text" />
            </label>
            <label className="field">
              <span>Tenant slug</span>
              <input defaultValue={context.organization.slug} disabled type="text" />
            </label>
            <SubmitButton className="primary-button" label="Save settings" pendingLabel="Saving..." />
          </form>
        ) : (
          <p className="helper-copy">Only admins and owners can update organization settings.</p>
        )}
      </section>

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Routing model</p>
            <h2>Tenant resolution</h2>
          </div>
        </div>
        <p>
          The canonical workspace route is <code>/w/{context.organization.slug}</code>. Middleware is prepared to
          rewrite future subdomain traffic into the same route-backed tenant context, so the app still has a single
          source of truth for isolation.
        </p>
      </section>
    </div>
  );
}
