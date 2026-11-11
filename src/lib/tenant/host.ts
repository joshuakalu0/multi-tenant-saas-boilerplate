import { getServerEnv } from "@/lib/env";

const reservedHosts = new Set(["app", "www"]);

export function getTenantSlugFromHost(host: string | null) {
  if (!host) {
    return null;
  }

  const normalizedHost = host.toLowerCase();
  const rootDomain = getServerEnv().APP_ROOT_DOMAIN.toLowerCase();

  if (!normalizedHost.endsWith(rootDomain)) {
    return null;
  }

  const prefix = normalizedHost.slice(0, normalizedHost.length - rootDomain.length).replace(/\.$/, "");

  if (!prefix || reservedHosts.has(prefix)) {
    return null;
  }

  return prefix;
}
