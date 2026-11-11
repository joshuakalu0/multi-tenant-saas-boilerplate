import { createProjectAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getTenantContext } from "@/lib/tenant/context";
import { listProjectsForOrganization } from "@/lib/tenant/service";
import { formatDate } from "@/lib/utils";

export default async function WorkspaceProjectsPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const context = await getTenantContext(slug);
  const projects = await listProjectsForOrganization(context.organization.id);

  return (
    <div className="stack gap-lg">
      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">New project</p>
            <h2>Create a tenant-scoped project</h2>
          </div>
        </div>
        {query.created ? <p className="form-success">Project created.</p> : null}
        {query.error ? <p className="form-error">We couldn’t create that project.</p> : null}
        <form action={createProjectAction.bind(null, slug)} className="onboarding-form">
          <label className="field">
            <span>Project name</span>
            <input name="name" placeholder="Northstar Web Platform" required type="text" />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              placeholder="What does this project represent for the workspace?"
            />
          </label>
          <SubmitButton className="primary-button" label="Create project" pendingLabel="Creating..." />
        </form>
      </section>

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Project list</p>
            <h2>Active tenant resources</h2>
          </div>
        </div>
        <div className="card-grid">
          {projects.length ? (
            projects.map((project) => (
              <article className="panel stack gap-sm" key={project.id}>
                <div className="tag-row">
                  <span className="pill">{project.status}</span>
                  <span className="tag">{project.slug}</span>
                </div>
                <h2>{project.name}</h2>
                <p>{project.description ?? "No description yet."}</p>
                <p className="small-copy">Updated {formatDate(project.updatedAt)}</p>
              </article>
            ))
          ) : (
            <div className="empty-card">
              <p className="eyebrow">No projects yet</p>
              <h2>The workspace is ready for its first project.</h2>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
