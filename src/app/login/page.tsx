import Link from "next/link";
import { redirect } from "next/navigation";

import { signInWithCredentials, signInWithGitHub, signInWithGoogle } from "@/app/actions";
import { auth } from "@/auth";
import { CredentialsForm } from "@/components/credentials-form";
import { getServerEnv } from "@/lib/env";
import { getDefaultOrganizationForUser } from "@/lib/tenant/service";

export default async function LoginPage({
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
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/";
  const env = getServerEnv();

  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <p className="eyebrow">Secure entry</p>
        <h1>Get back into your tenant workspace without losing the shape of the product around you.</h1>
        <p>
          Sessions, tenant context, role checks, billing state, and project limits are all resolved after sign-in,
          so every user lands in the right organization with the right privileges.
        </p>
        <ul className="feature-list">
          <li>Credentials sign-in for local accounts</li>
          <li>OAuth shortcuts for GitHub and Google when configured</li>
          <li>Immediate redirect into onboarding or the correct workspace</li>
        </ul>
      </section>
      <section className="auth-main gap-md">
        <CredentialsForm
          action={signInWithCredentials}
          footerHref="/register"
          footerLabel="Create one"
          footerText="Need an account?"
          heading="Sign in"
          mode="sign-in"
          pendingLabel="Signing you in..."
          redirectTo={redirectTo}
          submitLabel="Sign in"
          supportingCopy="Use your workspace credentials to open the right tenant dashboard."
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
