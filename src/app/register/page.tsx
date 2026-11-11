import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CredentialsForm } from "@/components/credentials-form";
import { getServerEnv } from "@/lib/env";
import { getDefaultOrganizationForUser } from "@/lib/tenant/service";
import { registerWithCredentials, signInWithGitHub, signInWithGoogle } from "@/app/actions";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (session?.user?.id) {
    const organization = await getDefaultOrganizationForUser(session.user.id);
    redirect(organization ? `/w/${organization.slug}` : "/onboarding");
  }

  const params = await searchParams;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/onboarding";
  const env = getServerEnv();

  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <p className="eyebrow">Create access</p>
        <h1>Open a new SaaS workspace with a real onboarding flow, member model, and billing backbone from day one.</h1>
        <p>
          Registration creates an account first, then hands off to an onboarding draft so the user can shape their
          organization deliberately instead of being dropped into a generic empty state.
        </p>
        <ul className="feature-list">
          <li>Strong-password registration with secure hashing</li>
          <li>Optional GitHub and Google signup paths</li>
          <li>Invitation-compatible redirect flow for new teammate onboarding</li>
        </ul>
      </section>
      <section className="auth-main gap-md">
        <CredentialsForm
          action={registerWithCredentials}
          footerHref="/login"
          footerLabel="Sign in"
          footerText="Already have an account?"
          heading="Create your account"
          mode="sign-up"
          pendingLabel="Creating your account..."
          redirectTo={redirectTo}
          submitLabel="Create account"
          supportingCopy="Once your account is ready, you’ll continue straight into tenant onboarding."
        />
        <div className="panel stack gap-sm">
          <p className="helper-copy">OAuth shortcuts</p>
          <div className="oauth-grid">
            {env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET ? (
              <form action={signInWithGitHub}>
                <input name="redirectTo" type="hidden" value={redirectTo} />
                <button className="ghost-button" type="submit">
                  Continue with GitHub
                </button>
              </form>
            ) : null}
            {env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET ? (
              <form action={signInWithGoogle}>
                <input name="redirectTo" type="hidden" value={redirectTo} />
                <button className="ghost-button" type="submit">
                  Continue with Google
                </button>
              </form>
            ) : null}
          </div>
        </div>
        <p className="helper-copy">
          <Link href="/">Back to the product overview</Link>
        </p>
      </section>
    </main>
  );
}
