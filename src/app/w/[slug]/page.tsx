import Link from "next/link";

import { getTenantContext } from "@/lib/tenant/context";
import { listAuditLogs, listProjectsForOrganization } from "@/lib/tenant/service";
import { formatDate } from "@/lib/utils";

export default async function WorkspaceDashboardPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getTenantContext(slug);
  const [projects, auditLogs] = await Promise.all([
    listProjectsForOrganization(context.organization.id),
    listAuditLogs(context.organization.id)
  ]);

  return (
    <div className="stack gap-lg">
      <section className="stats-grid">
        <article className="stat-card">
          <span>Plan</span>
          <strong>{context.organization.plan}</strong>
          <p>Subscription state: {context.organization.subscriptionStatus}</p>
        </article>
        <article className="stat-card">
          <span>Members</span>
          <strong>{context.usersCount}</strong>
          <p>Role-aware access is enforced across UI actions and APIs.</p>
        </article>
        <article className="stat-card">
          <span>Projects</span>
          <strong>{context.projectsCount}</strong>
          <p>Projects are the tenant-owned resource used for limits and API examples.</p>
        </article>
      </section>

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Recent workspace activity</h2>
          </div>
          <Link className="primary-button" href={`/w/${slug}/projects`}>
            Manage projects
          </Link>
        </div>
        {projects.length ? (
          <div className="card-grid">
            {projects.slice(0, 4).map((project) => (
              <article className="panel stack gap-sm" key={project.id}>
                <div className="tag-row">
                  <span className="pill">{project.status}</span>
                  <span className="tag">{project.slug}</span>
                </div>
                <h2>{project.name}</h2>
                <p>{project.description ?? "No description yet. Use the projects page to add product context."}</p>
                <p className="small-copy">Updated {formatDate(project.updatedAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <p className="eyebrow">No projects yet</p>
            <h2>Create the first tenant resource.</h2>
            <p>Projects are how this starter turns abstract SaaS concepts into a real workspace product surface.</p>
          </div>
        )}
      </section>

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Audit feed</p>
            <h2>Recent admin actions</h2>
          </div>
          <Link className="ghost-button" href={`/w/${slug}/audit-log`}>
            Open full log
          </Link>
        </div>
        <ul className="audit-list">
          {auditLogs.slice(0, 6).map((entry) => (
            <li key={entry.id}>
              <strong>{entry.action}</strong>
              <p>
                {entry.actor?.name ?? entry.actor?.email ?? "System"} · {formatDate(entry.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
