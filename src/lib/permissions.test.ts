import { describe, expect, it } from "vitest";

import { hasPlanCapacity, hasRequiredRole } from "@/lib/permissions";

describe("permissions", () => {
  it("enforces role hierarchy correctly", () => {
    expect(hasRequiredRole("OWNER", "ADMIN")).toBe(true);
    expect(hasRequiredRole("ADMIN", "MEMBER")).toBe(true);
    expect(hasRequiredRole("MEMBER", "ADMIN")).toBe(false);
  });

  it("evaluates plan limits against current usage", () => {
    expect(hasPlanCapacity("FREE", "members", 2)).toBe(true);
    expect(hasPlanCapacity("FREE", "members", 3)).toBe(false);
    expect(hasPlanCapacity("ENTERPRISE", "projects", 999)).toBe(true);
  });
});
