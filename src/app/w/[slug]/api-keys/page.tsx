import { ApiKeyPanel } from "@/components/api-key-panel";
import { getTenantContext } from "@/lib/tenant/context";
import { listApiKeys } from "@/lib/tenant/service";

export default async function WorkspaceApiKeysPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getTenantContext(slug);
  const keys = await listApiKeys(context.organization.id);

  return (
    <ApiKeyPanel
      canManage={context.membershipRole === "OWNER" || context.membershipRole === "ADMIN"}
      organizationSlug={slug}
      records={keys}
    />
  );
}
