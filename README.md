# Maid App Admin (HelpNest / JobReady)

Operations dashboard for HelpNest — JobReady (Maid Finder Kenya) — users,
pricing, payments + M-Pesa reversals, KYC review, jobs moderation, PRD §21
metrics and the §19.2 audit trail.

Repo: `github.com/AmungaLucas/maid-app-admin` · Live: `admin.jobready.co.ke`

Next.js 14 (App Router) + TypeScript + Tailwind, zero other runtime deps.
All data comes from the gateway admin API (`/api/admin/*` on
`gateway.jobready.co.ke`) through a server-side proxy — the gateway URL and
the admin JWT never reach the browser.

## Roles (PRD §19.1)

| Role    | Can |
|---------|-----|
| admin   | everything, incl. dashboard team management |
| support | users, credits, KYC review, jobs moderation |
| finance | pricing, pay options, transactions, M-Pesa reversals |

The gateway enforces these per endpoint; the UI only mirrors them.

## Pricing

Prices live in the gateway's `plans` + `pay_options` tables and are edited
live from **Plans & Pricing**. Edits apply to new purchases instantly
(PRD §6.2) with a confirmation dialog; existing subscriptions keep their
price until the period ends.

## M-Pesa reversal (one-time setup)

The Reversal flow needs two extra keys in the gateway `.env` (cPanel):

```
MPESA_PROD_INITIATOR_NAME=the-api-operator-name
MPESA_PROD_SECURITY_CREDENTIAL=<encrypted-credential-from-portal>
```

Without them, reversal endpoints answer 503 with the missing key names.
`MPESA_REVERSAL_RESULT_URL` / `MPESA_REVERSAL_TIMEOUT_URL` default to
`https://gateway.jobready.co.ke/api/payments/reversal/{result,timeout}` —
already live, no Daraja dashboard config needed for those.

The initiator credential is the API operator password from the Safaricom
portal, encrypted per Daraja's guide (GPG step). Financial role approves;
every reversal (success or failure) lands in the audit trail, and unused
entitlements from the reversed payment are revoked automatically.

## Deploy (Vercel)

The project is deployed from this repo via the Vercel CLI; every push to
`main` can be re-deployed with `npx vercel --prod`. Environment variable
set on the project: `GATEWAY_URL=https://gateway.jobready.co.ke`
(falls back to that URL in code if unset).

Custom domain `admin.jobready.co.ke` is attached to the project. If it ever
needs re-pointing, in cPanel Zone Editor add:

```
Type  Name   Target
CNAME admin  cname.vercel-dns.com
```

DNS propagation is usually minutes on cPanel. Vercel issues the TLS cert
automatically.

## Local development

```
npm install
cp .env.example .env.local   # set GATEWAY_URL
npm run dev                  # http://localhost:3000
```

Login with a dashboard account (seeded: admin@jobready.co.ke — change the
password in Dashboard Team → Your own password after first sign-in).

## Structure

```
src/app/login/            sign-in
src/app/(dash)/           overview, users(+[id]), plans, transactions,
                          kyc, jobs, metrics, audit, admins
src/app/admin-api/[...path]/route.ts   gateway proxy + cookie session
src/middleware.ts         auth gate
src/lib/                  api client, RBAC mirror, formatters
src/components/           Shell + minimal UI kit
```
