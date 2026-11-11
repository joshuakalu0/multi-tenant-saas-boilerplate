import { beforeEach, describe, expect, it } from "vitest";

import { resetServerEnvCache } from "@/lib/env";
import { getTenantSlugFromHost } from "@/lib/tenant/host";

describe("host tenant extraction", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.APP_ROOT_DOMAIN = "lvh.me:3000";
    resetServerEnvCache();
  });

  it("extracts a tenant slug from supported subdomains", () => {
    expect(getTenantSlugFromHost("acme.lvh.me:3000")).toBe("acme");
  });

  it("ignores reserved or root hosts", () => {
    expect(getTenantSlugFromHost("www.lvh.me:3000")).toBeNull();
    expect(getTenantSlugFromHost("lvh.me:3000")).toBeNull();
  });
});
