# Project 1: Multi-Tenant SaaS Starter (Next.js)

Enterprise-style logical multi-tenant SaaS built with Next.js App Router, Prisma, Auth.js, Stripe-compatible billing flows, and a path-based tenant workspace model.

## Runtime

- App package: `apps/saas-next`
- Canonical tenant route: `/w/[slug]/*`
- Database: PostgreSQL via app-local Prisma schema
- Auth: Auth.js credentials + GitHub + Google
- Billing: Stripe-compatible server integration
- Email: Resend HTTP API

## Local commands

```bash
pnpm --filter @booster/saas-next db:generate
pnpm --filter @booster/saas-next dev
pnpm --filter @booster/saas-next test
pnpm --filter @booster/saas-next build
```
