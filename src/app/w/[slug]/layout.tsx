import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { requireViewerSession } from "@/lib/session";
import { getTenantContext } from "@/lib/tenant/context";
import { getOrganizationsForUser } from "@/lib/tenant/service";

export default async function WorkspaceLayout({
  children,
  params
}: Readonly<{
  children: ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const [{ slug }, session] = await Promise.all([params, requireViewerSession()]);
  const [context, memberships] = await Promise.all([
    getTenantContext(slug),
    getOrganizationsForUser(session.user.id)
  ]);

  return (
    <main className="workspace-shell">
      <div className="workspace-grid">
        <aside className="stack gap-md">
          <div className="sidebar-card stack gap-md">
            <div>
              <p className="eyebrow">Active workspace</p>
              <h2>{context.organization.name}</h2>
              <p className="helper-copy">Role: {context.membershipRole}</p>
            </div>
            <nav className="workspace-nav">
              <Link className="active" href={`/w/${slug}`}>
                Dashboard
              </Link>
              <Link href={`/w/${slug}/projects`}>Projects</Link>
              <Link href={`/w/${slug}/members`}>Members</Link>
              <Link href={`/w/${slug}/settings`}>Settings</Link>
              <Link href={`/w/${slug}/billing`}>Billing</Link>
              <Link href={`/w/${slug}/api-keys`}>API keys</Link>
              <Link href={`/w/${slug}/audit-log`}>Audit log</Link>
            </nav>
            <SignOutButton />
          </div>
          <WorkspaceSwitcher activeSlug={slug} memberships={memberships} />
        </aside>

        <section className="workspace-main">
          <header className="workspace-main-panel workspace-header">
            <div>
              <p className="eyebrow">Tenant workspace</p>
              <h1>{context.organization.name}</h1>
              <p>Everything in this workspace is logically scoped to <code>{context.organization.slug}</code>.</p>
            </div>
            <div className="meta">
              <span className="pill">{context.organization.plan}</span>
              <span className="tag">{context.usersCount} members</span>
              <span className="tag">{context.projectsCount} projects</span>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
