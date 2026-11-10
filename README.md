# MT Club

The public MT Club website is built with Next.js App Router, TypeScript, and Tailwind CSS. Its routes are `/`, `/about`, `/events`, `/team`, and `/join`. Arabic is available from the language control in the navigation and switches the document to RTL.

## Development

```sh
npm install
npm run dev
```

`npm run build` creates the production build and `npm start` serves it.

## Content

- Update the home statistics and bilingual feature/about copy in `data/site.ts`.
- Add confirmed events to `data/events.ts`.
- Update the team roster in `data/team.ts`. Existing seeded names and roles have been retained.

## Membership applications

The join form accepts up to three committees from the shared list in `data/committees.ts`. Store applications in Supabase using `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY`; optionally set `JOIN_WEBHOOK_URL` to forward each saved application. Apply `backend/migrations/014_join_application_committees.sql` to existing Supabase projects (or run the current `013_join_applications.sql` for a new table). Administrators can review and filter applications at `/admin/applications`.

## Club management system setup

The authenticated management APIs use PostgreSQL through Prisma. Copy `.env.example` to `.env`, configure `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (32+ characters), and `QR_TOKEN_SECRET` (32+ characters), then run:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
```

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a one-time `ADMIN_PASSWORD` of at least 12 characters before seeding. The seed creates the initial Admin, two committees, two Leaders, ten sample Members, a reusable Main Hall zone, sample events, and the existing team roster. Newly seeded accounts are forced to change their temporary passwords at first sign-in; one-time temporary passwords for generated demo accounts are printed by the seed command. Keep those credentials private and rotate them after setup.

Team photo uploads require the server-only Supabase Storage settings in `.env.example`. Admins manage the public roster on `/team`, accounts at `/admin/users`, events at `/admin/events`, zones on the OpenStreetMap-backed `/admin/zones`, and communications on `/admin/notifications`. `/attendance` provides QR session management, rotating QR display, camera scanning, high-accuracy location check-in, live check-ins, manual attendance marking, and CSV export. Camera and location access require a secure origin (HTTPS or localhost).

The site includes a web app manifest, a service worker, in-app notifications, SSE unread-count updates, scheduled notification delivery through Vercel Cron, and optional Web Push. To enable push, configure matching `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` values. On iOS, users must install the PWA before opting in to push.

Account recovery emails use Resend when `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are configured. Reset links expire after one hour and can only be used once. Sign-in is limited to five failed attempts per IP/email pair in 15 minutes; enabling "Remember me" extends the session from eight hours to 30 days. Logging out invalidates all active sessions for that account.

Admins and Leaders can review role-scoped attendance reports at `/admin/reports`, including date and committee filters, attendance-rate charts, member summaries, and CSV export. Scheduled absence warnings are sent once a member reaches `ABSENCE_WARNING_THRESHOLD` unexcused completed sessions; the default is `3` and valid values are `1`–`100`.

`npm run test:system` runs login, permission-map, committee-scope, geofence, late-status, absence-warning threshold, and QR-token tests. A configured PostgreSQL instance is required to exercise database-backed routes or apply migrations.
