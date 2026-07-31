# Envelock Admin Console

The **platform (super-admin) console** — a self-contained app, separate from
`client/`. It manages every tenant and user across the whole deployment.

- Stack: React + Vite + TypeScript + Tailwind (same as `client/`, its own build).
- Port **5174** (client is 5173). Proxies `/api` → the backend on 8010, so there
  is no cross-origin call in dev.
- Dark/light theme, mobile responsive.

## Access

Access is an **email allowlist set at deployment** — it can never be granted
through the product. On the server, set:

```bash
ENVELOCK_SUPERADMIN_EMAILS="you@yourcompany.com,ops@yourcompany.com"
```

Operators sign in with their normal Envelock credentials. A valid session whose
email isn't on the list is shown "Not authorized" (the API returns 404, so the
surface isn't even advertised).

## Run

```bash
cd admin
npm install
npm run dev      # http://localhost:5174
```

The backend (`server/`, port 8010) must be running. Build with `npm run build`.

## What it does

- **Overview** — platform-wide counts, plan distribution.
- **Tenants** — search, and per-tenant: change plan, extend trial, suspend /
  reactivate, and manage every user (approve, suspend, reactivate, change role).
- **Users** — global search + the same per-user actions.

Every mutating action is written to the audit log with the operator's id. The
console never exposes secrets (password hashes, TOTP secrets, mailbox
credentials, card fingerprints).
