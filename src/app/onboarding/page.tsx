import { redirect } from "next/navigation";

import { completeOnboardingAction, saveOnboardingIdentityAction, saveOnboardingPlanAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireViewerSession } from "@/lib/session";
import { getDefaultOrganizationForUser, getOnboardingDraft } from "@/lib/tenant/service";

const plans = [
  {
    copy: "A lean starting point for solo builders and tiny internal teams.",
    label: "Free",
    value: "FREE"
  },
  {
    copy: "Expanded collaboration limits and a smoother path to production use.",
    label: "Pro",
    value: "PRO"
  },
  {
    copy: "The no-drama plan for organizations that need scale and control.",
    label: "Enterprise",
    value: "ENTERPRISE"
  }
] as const;

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireViewerSession();
  const organization = await getDefaultOrganizationForUser(session.user.id);

  if (organization) {
    redirect(`/w/${organization.slug}`);
  }

  const [draft, params] = await Promise.all([getOnboardingDraft(session.user.id), searchParams]);
  const requestedStep = typeof params.step === "string" ? Number(params.step) : 1;
  const step = Number.isNaN(requestedStep) ? 1 : Math.min(Math.max(requestedStep, 1), 3);
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card stack gap-lg">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Shape the organization before you drop into the dashboard.</h1>
          <p>
            The onboarding draft is stored server-side, so closing the tab won’t lose the tenant setup you already
            entered.
          </p>
        </div>

        <div className="tag-row">
          <span className={step >= 1 ? "pill" : "tag"}>1. Identity</span>
          <span className={step >= 2 ? "pill" : "tag"}>2. Plan</span>
          <span className={step >= 3 ? "pill" : "tag"}>3. Confirm</span>
        </div>

        {error ? <p className="form-error">We couldn’t save that onboarding step. Review the form and try again.</p> : null}

        {step === 1 ? (
          <form action={saveOnboardingIdentityAction} className="onboarding-form">
            <label className="field">
              <span>Organization name</span>
              <input
                defaultValue={draft?.organizationName ?? ""}
                name="organizationName"
                placeholder="Northstar Labs"
                required
                type="text"
              />
            </label>
            <label className="field">
              <span>Preferred slug</span>
              <input
                defaultValue={draft?.slug ?? ""}
                name="suggestedSlug"
                placeholder="northstar-labs"
                type="text"
              />
            </label>
            <SubmitButton className="primary-button" label="Continue to plan" pendingLabel="Saving..." />
          </form>
        ) : null}

        {step === 2 ? (
          <form action={saveOnboardingPlanAction} className="onboarding-form">
            <div className="pricing-grid">
              {plans.map((plan) => (
                <label className={draft?.plan === plan.value ? "pricing-card highlight" : "pricing-card"} key={plan.value}>
                  <input
                    defaultChecked={(draft?.plan ?? "FREE") === plan.value}
                    name="plan"
                    type="radio"
                    value={plan.value}
                  />
                  <strong>{plan.label}</strong>
                  <p>{plan.copy}</p>
                </label>
              ))}
            </div>
            <div className="hero-actions">
              <a className="ghost-button" href="/onboarding?step=1">
                Back
              </a>
              <SubmitButton className="primary-button" label="Continue to review" pendingLabel="Saving..." />
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form action={completeOnboardingAction} className="onboarding-form">
            <div className="panel stack gap-sm">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Review</p>
                  <h2>{draft?.organizationName ?? "Your organization"}</h2>
                </div>
              </div>
              <div className="tag-row">
                <span className="pill">{draft?.slug ?? "workspace-slug"}</span>
                <span className="pill">{draft?.plan ?? "FREE"}</span>
              </div>
              <p className="helper-copy">
                Creating this organization will make you the owner, provision the tenant workspace, and prepare
                billing customer data for later upgrades.
              </p>
            </div>
            <div className="hero-actions">
              <a className="ghost-button" href="/onboarding?step=2">
                Back
              </a>
              <SubmitButton className="primary-button" label="Create workspace" pendingLabel="Creating..." />
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
