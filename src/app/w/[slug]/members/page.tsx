import {
  inviteMemberAction,
  removeMemberAction,
  transferOwnershipAction,
  updateMemberRoleAction
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getTenantContext } from "@/lib/tenant/context";
import { listOrganizationInvites, listOrganizationMembers } from "@/lib/tenant/service";
import { formatDate } from "@/lib/utils";

export default async function WorkspaceMembersPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const context = await getTenantContext(slug);
  const [members, invites] = await Promise.all([
    listOrganizationMembers(context.organization.id),
    listOrganizationInvites(context.organization.id)
  ]);
  const canManage = context.membershipRole === "OWNER" || context.membershipRole === "ADMIN";

  return (
    <div className="stack gap-lg">
      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Invite teammates</p>
            <h2>Grow the workspace carefully</h2>
          </div>
        </div>
        {query.invited ? <p className="form-success">Invite sent.</p> : null}
        {query.updated ? <p className="form-success">Member role updated.</p> : null}
        {query.removed ? <p className="form-success">Member removed.</p> : null}
        {query.transferred ? <p className="form-success">Ownership transferred.</p> : null}
        {query.error ? <p className="form-error">We couldn’t complete that member action.</p> : null}
        {canManage ? (
          <form action={inviteMemberAction.bind(null, slug)} className="inline-form">
            <label className="field grow">
              <span>Invite email</span>
              <input name="email" placeholder="new-teammate@company.com" required type="email" />
            </label>
            <label className="field">
              <span>Role</span>
              <select defaultValue="MEMBER" name="role">
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <SubmitButton className="primary-button" label="Send invite" pendingLabel="Sending..." />
          </form>
        ) : (
          <p className="helper-copy">Only admins and owners can invite new members.</p>
        )}
      </section>

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Current members</p>
            <h2>Roles and access</h2>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((membership) => (
              <tr key={membership.id}>
                <td>{membership.user.name ?? "Unnamed user"}</td>
                <td>{membership.user.email}</td>
                <td>
                  {canManage && membership.role !== "OWNER" ? (
                    <form action={updateMemberRoleAction.bind(null, slug)} className="inline-actions">
                      <input name="membershipId" type="hidden" value={membership.id} />
                      <select defaultValue={membership.role} name="role">
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button className="ghost-button" type="submit">
                        Save
                      </button>
                    </form>
                  ) : (
                    <span className="pill">{membership.role}</span>
                  )}
                </td>
                <td>{formatDate(membership.joinedAt)}</td>
                <td className="table-actions">
                  {canManage && membership.role !== "OWNER" ? (
                    <form action={removeMemberAction.bind(null, slug)}>
                      <input name="membershipId" type="hidden" value={membership.id} />
                      <button className="danger-button" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {context.membershipRole === "OWNER" && members.length > 1 ? (
        <section className="workspace-main-panel stack gap-md">
          <div className="section-header">
            <div>
              <p className="eyebrow">Ownership</p>
              <h2>Transfer workspace ownership</h2>
            </div>
          </div>
          <form action={transferOwnershipAction.bind(null, slug)} className="inline-form">
            <label className="field grow">
              <span>Next owner</span>
              <select name="targetMembershipId" required>
                <option value="">Select a member</option>
                {members
                  .filter((membership) => membership.role !== "OWNER")
                  .map((membership) => (
                    <option key={membership.id} value={membership.id}>
                      {membership.user.name ?? membership.user.email} · {membership.role}
                    </option>
                  ))}
              </select>
            </label>
            <SubmitButton className="danger-button" label="Transfer ownership" pendingLabel="Transferring..." />
          </form>
        </section>
      ) : null}

      <section className="workspace-main-panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">Pending invites</p>
            <h2>Outstanding access requests</h2>
          </div>
        </div>
        <ul className="timeline-list">
          {invites.length ? (
            invites.map((invite) => (
              <li key={invite.id}>
                <strong>{invite.email}</strong>
                <p>
                  Role: {invite.role} · Expires {formatDate(invite.expiresAt)}
                </p>
              </li>
            ))
          ) : (
            <li>
              <strong>No pending invites</strong>
              <p>Every invite issued so far has either been accepted or expired.</p>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
