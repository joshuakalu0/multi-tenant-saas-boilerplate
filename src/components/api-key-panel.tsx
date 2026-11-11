"use client";

import { useActionState } from "react";

import type { ApiKey } from "@prisma/client";

import { createApiKeyAction, defaultApiKeyFormState, revokeApiKeyAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/utils";

type ApiKeyPanelProps = {
  canManage: boolean;
  organizationSlug: string;
  records: ApiKey[];
};

export function ApiKeyPanel({ canManage, organizationSlug, records }: ApiKeyPanelProps) {
  const [state, formAction] = useActionState(createApiKeyAction.bind(null, organizationSlug), defaultApiKeyFormState);

  return (
    <div className="stack gap-lg">
      <section className="panel stack gap-md">
        <div className="section-header">
          <div>
            <p className="eyebrow">API access</p>
            <h2>Named API keys</h2>
          </div>
        </div>
        {canManage ? (
          <form action={formAction} className="inline-form">
            <label className="field grow">
              <span>Key name</span>
              <input name="name" placeholder="Production sync worker" required type="text" />
            </label>
            <SubmitButton className="primary-button" label="Create key" pendingLabel="Creating..." />
          </form>
        ) : (
          <p className="helper-copy">Only owners and admins can create or revoke API keys.</p>
        )}
        {state.error ? <p className="form-error">{state.error}</p> : null}
        {state.success ? <p className="form-success">{state.success}</p> : null}
        {state.rawKey ? (
          <div className="code-card">
            <span>Copy this key now</span>
            <code>{state.rawKey}</code>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Last used</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td>
                    <code>{record.keyPrefix}</code>
                  </td>
                  <td>{record.lastUsedAt ? formatDate(record.lastUsedAt) : "Never"}</td>
                  <td>
                    <span className={record.revokedAt ? "pill danger" : "pill success"}>
                      {record.revokedAt ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="table-actions">
                    {canManage && !record.revokedAt ? (
                      <form action={revokeApiKeyAction.bind(null, organizationSlug)}>
                        <input name="keyId" type="hidden" value={record.id} />
                        <button className="ghost-button" type="submit">
                          Revoke
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No API keys created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
