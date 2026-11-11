import { getTenantContext } from "@/lib/tenant/context";
import { listAuditLogs } from "@/lib/tenant/service";
import { formatDate } from "@/lib/utils";

export default async function WorkspaceAuditLogPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getTenantContext(slug);
  const auditLogs = await listAuditLogs(context.organization.id);

  return (
    <section className="workspace-main-panel stack gap-md">
      <div className="section-header">
        <div>
          <p className="eyebrow">Audit log</p>
          <h2>High-signal administrative history</h2>
        </div>
      </div>
      <ul className="audit-list">
        {auditLogs.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.action}</strong>
            <p>
              {entry.actor?.name ?? entry.actor?.email ?? "System"} · {formatDate(entry.createdAt)}
            </p>
            {entry.targetType || entry.targetId ? (
              <p className="small-copy">
                {entry.targetType}
                {entry.targetId ? ` · ${entry.targetId}` : ""}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
