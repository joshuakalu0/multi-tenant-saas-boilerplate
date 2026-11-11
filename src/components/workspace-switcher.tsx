import Link from "next/link";

type WorkspaceSwitcherProps = {
  activeSlug: string;
  memberships: Array<{
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    role: string;
  }>;
};

export function WorkspaceSwitcher({ activeSlug, memberships }: WorkspaceSwitcherProps) {
  return (
    <div className="panel stack gap-sm">
      <div className="section-header">
        <div>
          <p className="eyebrow">Workspaces</p>
          <h2>Your organizations</h2>
        </div>
      </div>
      <div className="workspace-switcher">
        {memberships.map((membership) => (
          <Link
            className={membership.organization.slug === activeSlug ? "workspace-link active" : "workspace-link"}
            href={`/w/${membership.organization.slug}`}
            key={membership.organization.id}
          >
            <span>{membership.organization.name}</span>
            <strong>{membership.role}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
