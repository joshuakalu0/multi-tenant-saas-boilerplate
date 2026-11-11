import Link from "next/link";

import { acceptInviteAction } from "@/app/actions";
import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function JoinInvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, session, query] = await Promise.all([params, auth(), searchParams]);
  const invite = await getPrismaClient().inviteToken.findUnique({
    include: {
      organization: true
    },
    where: {
      token
    }
  });
  const error = typeof query.error === "string" ? query.error : null;

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <main className="join-shell">
        <section className="join-card stack gap-md">
          <div>
            <p className="eyebrow">Invite unavailable</p>
            <h1>This invitation has expired or already been used.</h1>
            <p>Ask an owner or admin to issue a fresh invite link.</p>
          </div>
          <Link className="primary-button" href="/">
            Return home
          </Link>
        </section>
      </main>
    );
  }

  if (!session?.user?.id) {
    const redirectTo = `/join/${token}`;

    return (
      <main className="join-shell">
        <section className="join-card stack gap-md">
          <div>
            <p className="eyebrow">Join workspace</p>
            <h1>{invite.organization.name} invited {invite.email}</h1>
            <p>This link expires on {formatDate(invite.expiresAt)}. Sign in or register with the invited email address to join.</p>
          </div>
          <div className="hero-actions">
            <Link className="primary-button" href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`}>
              Create account
            </Link>
            <Link className="ghost-button" href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>
              Sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const emailMatches = session.user.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <main className="join-shell">
      <section className="join-card stack gap-md">
        <div>
          <p className="eyebrow">Invitation review</p>
          <h1>Join {invite.organization.name}</h1>
          <p>
            This invite is for <strong>{invite.email}</strong> as a <strong>{invite.role}</strong>. It expires on{" "}
            {formatDate(invite.expiresAt)}.
          </p>
        </div>
        {error ? <p className="form-error">We couldn’t accept this invite with the current account.</p> : null}
        {!emailMatches ? (
          <p className="form-error">
            You are signed in as {session.user.email ?? "another account"}. Switch to {invite.email} before accepting this invite.
          </p>
        ) : (
          <form action={acceptInviteAction.bind(null, token)}>
            <button className="primary-button" type="submit">
              Accept invitation
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
