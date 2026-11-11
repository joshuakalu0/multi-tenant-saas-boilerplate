import { describe, expect, it } from "vitest";

import { slugifyOrganizationName, slugifyProjectName } from "@/lib/tenant/slug";

describe("slug helpers", () => {
  it("normalizes organization names into stable slugs", () => {
    expect(slugifyOrganizationName(" Northstar Labs ")).toBe("northstar-labs");
    expect(slugifyOrganizationName("Aju & Co. Studio")).toBe("aju-co-studio");
  });

  it("reuses the same normalization strategy for projects", () => {
    expect(slugifyProjectName("Website Revamp 2026")).toBe("website-revamp-2026");
  });
});
