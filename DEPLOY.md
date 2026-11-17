# MT Club — Staging Deployment Guide (New, Independent Vercel Project)

> **Production safety:** This guide is for a **new staging deployment only**. Do **not** modify, redeploy, reconfigure, or point anything in this guide at the existing production Vercel project/domain (`mt-club-seven.vercel.app`), production environment variables, or production database.

## 1) Architecture overview

**Target (staging):**
- **App:** Single **Next.js** application (App Router) — UI + Route Handlers under `app/` and `app/api/*`, Auth.js/NextAuth, Prisma.
- **Hosting:** **New independent Vercel project** (separate from production).
- **Database:** **New PostgreSQL** staging database (Neon or Supabase Postgres) managed by Prisma migrations.
- **Auth:** Auth.js with staging-only `AUTH_URL` / `AUTH_SECRET` and staging `NEXT_PUBLIC_APP_URL`.
- **Uploads:** Persistent object storage in staging (**Cloudinary** recommended/default in production, or **Supabase Storage**). Vercel filesystem is **not** persistent.
- **Notifications:** In-app notifications + optional Web Push (VAPID env vars). Scheduled/operational dispatch via protected cron endpoint `/api/cron/notifications`.

**Repository layout (relevant):** Next.js root is the repository root (`package.json`, `next.config.ts`, `app/`). `vercel.json` configures the Next.js build and cron only.

**Local development (unchanged):** SQLite remains supported for local dev (`DATABASE_PROVIDER=sqlite`, `DATABASE_URL=file:./dev.db`) via derived schema/push flow in dev scripts.

## 2) What must NOT be deployed with this staging app

The staging Vercel project must **not** accidentally deploy or depend on:
- Legacy **Express/Supabase backend** (`backend/`, `backend/server.js`) and `api/index.js` (legacy server entry).
- Legacy **Vite/React frontend** (`src/`, Vite configs/scripts for that client).
- Unrelated **Android/Capacitor/native** projects (`android/`, mobile release scripts) — not required for web staging.
- Local development databases (`prisma/dev.db`, `*.db-journal`) or local uploads as source of truth.
- Any production credentials, domains, or services.

**Legacy backend note:** `backend/` and legacy clients use a different auth/data model (Supabase tables/members, OneSignal device flows, etc.) than the Prisma/Next.js app. If those features are required, deploy the Express service **separately** with its own env/DB and do not attach it to production. Next-only staging does not require `NEXT_PUBLIC_API_URL`.

## 3) Git branch workflow

- **Staging branch:** `mtc`
- **Remote:** `https://github.com/ramadankbusiness-cyber/mt-club.git`
- Preserve legitimate local changes; **do not** use destructive cleanup, **do not** force-push, **do not** commit secrets/`.env*` files, and **do not** use `git add .` blindly.
- Create commits only after review and explicit approval. **Push/deploy only with explicit authorization.**

## 4) Create the staging PostgreSQL database (Neon or Supabase Postgres)

1. Create a **new** staging database/project (e.g. Neon project for staging). **Do not** use the production database.
2. Obtain connection strings (keep secret):
   - `DATABASE_URL` (pooled/primary as recommended by provider)
   - `DIRECT_URL` (direct/non-pooled connection, recommended for Prisma migrations; can equal `DATABASE_URL` if your provider does not require a separate direct URL)
3. Ensure `sslmode=require` (or provider-required TLS parameters) is present where required.
4. **Do not** run migrations or seeds against any database until you have confirmed it is the intended **staging** database.

## 5) Create the independent staging Vercel project

1. In Vercel: **Add New → Project** (do **not** modify the existing production project).
2. Import the repository and configure:
   - **Branch:** `mtc` (or the approved staging branch)
   - **Root Directory:** repository root (contains `package.json`, `next.config.ts`)
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (matches `vercel.json`)
   - **Install Command:** `npm install` (or lockfile-compatible default)
   - **Output Directory:** default (Next.js)
3. Use a **staging-only** deployment URL/domain and **staging-only** environment variables. Never reuse production env vars, DB, or domain.

## 6) Environment variables (staging)

Configure in Vercel (Project → Settings → Environment Variables) for the staging environments. **Never commit secrets.** Use placeholders in `.env.example` only.

### Required (core)
| Variable | Required | Notes |
|---|---:|---|
| `DATABASE_PROVIDER` | Yes | `postgresql` for staging |
| `DATABASE_URL` | Yes | Staging Postgres connection string (secret) |
| `DIRECT_URL` | Yes* | Direct Postgres URL for migrations (*set for hosted Postgres; may match `DATABASE_URL` if provider allows) |
| `AUTH_SECRET` | Yes | Random secret, **>= 32 chars** (e.g. `openssl rand -base64 32`) |
| `AUTH_URL` | Yes | Staging canonical URL, e.g. `https://<staging>.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same staging public URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Legacy alias supported; set same as `NEXT_PUBLIC_APP_URL` |
| `ADMIN_EMAIL` | Yes | Initial staging admin email (used by seed) |
| `QR_TOKEN_SECRET` | Yes | Secret for attendance QR/token signing |
| `CRON_SECRET` | Yes | Bearer secret for `/api/cron/notifications` (**>= 32 chars** recommended; endpoint enforces strong secret check) |

### Storage (persistent uploads required on Vercel)
| Variable | Required | Notes |
|---|---:|---|
| `STORAGE_DRIVER` | Yes (staging) | `cloudinary` (recommended) or `supabase`. **`local` is dev-only and not persistent on Vercel.** |
| `CLOUDINARY_CLOUD_NAME` | If cloudinary | |
| `CLOUDINARY_API_KEY` | If cloudinary | Server-only secret |
| `CLOUDINARY_API_SECRET` | If cloudinary | Server-only secret |
| `SUPABASE_URL` | If supabase | Supabase project URL |
| `SUPABASE_SECRET_KEY` | If supabase | Service-role/secret key (server-only, never public) |
| `SUPABASE_STORAGE_BUCKET` | If supabase | Default `club-assets` |

### Web Push (VAPID)
| Variable | Required | Notes |
|---|---:|---|
| `VAPID_PUBLIC_KEY` | Optional* | Required for push delivery |
| `VAPID_PRIVATE_KEY` | Optional* | Server-only secret |
| `VAPID_SUBJECT` | Optional* | e.g. `mailto:admin@example.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional* | Public key exposed to browser for subscriptions (*set all for push to work) |

Generate keys: `npx web-push generate-vapid-keys`

### Optional
| Variable | Notes |
|---|---|
| `ADMIN_PASSWORD` | If set during `seed:admin`/`seed:staging`, must be >= 16 chars with upper/lower/number; if unset a password is generated and **printed once** to stdout |
| `ABSENCE_WARNING_THRESHOLD` | Attendance warning threshold (app default applies if unset) |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | Email/password-reset delivery (if configured) |
| `JOIN_WEBHOOK_URL` | Optional join webhook |
| `ALLOWED_ORIGINS` | Optional origin allowlist for specific integrations |
| `NEXT_PUBLIC_API_URL` | **Legacy/optional** — external Express backend URL; not used by Next-only staging |
| `ONESIGNAL_*`, `VITE_*` | Legacy/mobile integrations only if explicitly required (separate from Next.js web push) |

## 7) Prisma migrations (PostgreSQL staging)

- **Schema:** `prisma/schema.prisma` (PostgreSQL). **Migrations:** `prisma/migrations/` (must not edit previously applied migrations).
- **New migration added (not applied):** `prisma/migrations/20261113220000_add_mtc_positions_and_committee_type/migration.sql`
  - Adds `Position` enum (`HEAD`,`VICE`,`LEADER`)
  - Extends `NotificationAudience` with `MTC`,`POSITION`
  - Adds `Committee.type` (`VARCHAR(20) NOT NULL DEFAULT 'committee'`)
  - Adds `User.position`/`User.isMTC` (defaults) + index `User_isMTC_position_idx`
  - Adds `TeamMember.position`/`TeamMember.isMTC` (defaults), makes `TeamMember.committeeId` nullable, adds index `TeamMember_isMTC_position_idx`
  - Adds `Notification.audiencePosition`
  - Changes `TeamMember.committeeId` FK delete behavior `RESTRICT` → `SET NULL`
  - **Safety notes:** additive columns/enums with safe defaults for existing rows; nullable FK change is compatible with existing data. Review SQL before applying. Enum `ADD VALUE` behavior is compatible with modern Postgres (Neon/Supabase); verify target Postgres version if unusual.

**Apply to staging DB only (after confirming target DB):**
```bash
npm ci
# Ensure DATABASE_PROVIDER=postgresql, DATABASE_URL, DIRECT_URL point to STAGING DB
npx prisma migrate deploy
```
- Never run `prisma migrate reset` or `prisma db push` against a remote database.
- For local SQLite dev, continue using existing dev scripts (`npm run dev` / `npm run db:migrate`) which derive/apply a local SQLite schema via `db push` flow.

## 8) Staging seed (safe, repeatable)

Run **against the staging database only** with staging env vars set:
```bash
npm run seed:staging
```
This runs in order:
1. `prisma/seed-committees.ts` — idempotent upsert of committees (includes **MTC** board entry + 7 regular committees)
2. `prisma/seed-admin.ts` — creates/ensures staging admin for `ADMIN_EMAIL` (idempotent update/create; prints generated password once if `ADMIN_PASSWORD` not set)
3. `prisma/seed.ts` — requires admin exists; creates sample/staging data where missing and upserts known sample team entries (including MTC example **Baher Alaa**) and sample accounts/events/zones as implemented

**Notes:** sample accounts/events/team/zone are **staging/sample data** — review before running in any shared environment. Seeds are designed to avoid blind duplication, but always run only on the intended staging DB. Do not use production credentials.

## 9) Authentication & URLs

- Set `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` to the **staging** Vercel URL (update and redeploy if the URL changes).
- Use a **staging-only** `AUTH_SECRET` and independent secrets (`QR_TOKEN_SECRET`, `CRON_SECRET`, VAPID keys) separate from production.
- Auth.js is configured with `trustHost: true` and secure cookie/session behavior appropriate for the environment.

## 10) Persistent upload storage

- Vercel filesystem is ephemeral. Configure `STORAGE_DRIVER=cloudinary` (recommended) or `supabase` for staging.
- Team/profile (and other club image) uploads are processed server-side and stored via the configured driver (`lib/image-storage.ts`).
- Do not migrate, delete, or overwrite existing production/user uploads.

## 11) Web Push & Cron

- **Web Push:** set all VAPID vars (server + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) and verify browser subscription/permission flows in staging.
- **Cron:** `vercel.json` schedules `GET/POST /api/cron/notifications` with `"* * * * *"` (every minute). The endpoint requires `Authorization: Bearer <CRON_SECRET>`.
  - **Plan compatibility:** minute-level cron may require a **paid Vercel plan** (Hobby plans have cron frequency/limits). If unavailable, keep the endpoint secured and trigger it via an external scheduler (e.g. GitHub Actions/cron service) calling the staging URL with the bearer secret, or adjust scheduling per your plan — do not disable security.

## 12) Deployment procedure

1. Ensure staging DB created and env vars configured in the **new** Vercel project.
2. Apply migrations against staging DB: `npx prisma migrate deploy`.
3. Seed staging DB: `npm run seed:staging` (capture admin password if generated).
4. Push/merge approved changes to `mtc` (only with explicit authorization).
5. Deploy via Vercel (new staging project). Confirm build uses `npm run build`.
6. Reconfirm `AUTH_URL`/`NEXT_PUBLIC_APP_URL` match the final staging URL and redeploy if needed.
7. Verify cron execution/auth and storage uploads.

## 13) Post-deployment testing checklist

Test on the **staging** URL (EN/AR and mobile widths as applicable):
- [ ] Homepage loads
- [ ] Arabic/English switching and RTL/LTR behavior
- [ ] Authentication (login/logout/session refresh)
- [ ] Admin login and protected routes
- [ ] Admin user management (create/update/roles/committee/position/MTC as applicable)
- [ ] Committee management/data (`/api/committees`, selectors)
- [ ] Dynamic team management and **team images** (persistent storage)
- [ ] Events (list/create/edit/publish as applicable)
- [ ] Event zones / attendance zones
- [ ] Attendance sessions and **QR generation**
- [ ] QR scanning/check-in **inside** allowed location (accepted)
- [ ] QR scanning/check-in **outside** allowed location (rejected)
- [ ] Attendance reports
- [ ] Notifications (in-app) and audience targeting
- [ ] Push subscriptions / push delivery (if VAPID configured)
- [ ] Password reset / change-password flows
- [ ] Mobile responsiveness

> Mark items tested only after actual verification on staging.

## 14) Rollback procedure

- **App/config rollback:** redeploy a previous known-good deployment in the **staging Vercel project** (or revert the staging branch commit via a normal PR/revert — no force-push).
- **Env rollback:** restore previous staging env var values in Vercel and redeploy.
- **Database:** Prisma migrations are forward-only in normal operation. Prefer **additive/compatible** migrations; if a migration causes issues, restore from a staging DB backup/snapshot (Neon/Supabase) or apply a **new forward corrective migration**. Never run destructive reset on shared/production data.
- **Production isolation:** rollback actions must target **staging only**.

## 15) Production isolation safeguards

- Separate Vercel project, separate URL, separate env vars, separate DB.
- No production domains/credentials in staging config.
- No `migrate reset`, no `db push` to remote, no seed against unknown/production DB.
- Do not modify or deploy the existing production Vercel project as part of staging work.

## 16) Local verification (reference)

```bash
npm ci
npm run build
npm start
```
(Use local env; default dev is SQLite per `.env.example`.) A successful SQLite/local build does **not** prove PostgreSQL staging runtime — apply and verify migrations/seeds on a staging Postgres database and test the staging deployment.
