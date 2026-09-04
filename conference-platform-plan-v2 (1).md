# Conference Discovery Platform — Revised Architecture Plan (v2)

This extends the original plan with: a secure admin panel, a moderated blog system, Stripe payments for conferences and speaker packages, hybrid (virtual + in-person) support, and a slug-based routing convention — while keeping a clean path to swap Supabase for a Node.js + PostgreSQL backend later.

---

## 1. Design Principle Carried Forward

**Never let React talk to Supabase directly outside the service layer.** Every new feature below (blogs, payments, admin) gets its own service file. This is the single most important rule for keeping the future Node.js migration cheap — when you migrate, you rewrite the *inside* of these files, not the components that call them.

```
src/services/
  conferenceService.ts
  companyService.ts
  bookmarkService.ts
  authService.ts
  blogService.ts          (new)
  paymentService.ts        (new)
  speakerPackageService.ts (new)
  adminService.ts          (new)
  storageService.ts        (new — wraps Supabase Storage so S3/R2 swap is one file)
```

---

## 2. Updated User Types & Permissions

| Action | Guest | Logged User | Blog Author (any logged user) | Admin |
|---|---|---|---|---|
| Browse/search conferences & companies | ✅ | ✅ | ✅ | ✅ |
| Read published blogs | ✅ | ✅ | ✅ | ✅ |
| Bookmark / Follow | ❌ | ✅ | ✅ | ✅ |
| Write a blog (draft) | ❌ | ✅ | ✅ | ✅ |
| Submit blog for review | ❌ | ✅ | ✅ | ✅ |
| See own draft/pending/rejected blogs | ❌ | ✅ (own only) | ✅ (own only) | ✅ (all) |
| Approve / reject blogs | ❌ | ❌ | ❌ | ✅ |
| Buy a ticket / speaker package (Stripe) | ❌ | ✅ | ✅ | ✅ |
| Create/edit company, conference, category | ❌ | ❌ | ❌ | ✅ |
| Manage speaker packages & pricing | ❌ | ❌ | ❌ | ✅ |
| View orders (no cancellations/refunds on-site) | ❌ | ❌ | ❌ | ✅ |
| Manage users (ban, promote to admin) | ❌ | ❌ | ❌ | ✅ |
| Assign / view event manager for a registration | ❌ | ✅ (view own) | ✅ (view own) | ✅ (assign + view all) |

Note: there's no separate "blog author" role — **any logged-in user can write a blog**; it just stays invisible to the public until admin approves it.

**Locked-in decisions from your last message** (superseding the "Open Questions" that used to sit at the end of this doc):
- Rejected blogs show a **generic, diplomatic status message** with a support contact email — never a custom per-post reason.
- **No cancellation or refund flow on the website at all.** Once paid, that's final on your platform; anything post-registration is between the attendee and the organizing company.
- Every paid registration gets **assigned an event manager** from the organizing company, who handles the attendee from there until they receive what they were promised.
- Partner companies do **not** get their own admin logins — your internal admin team manages everything.
- **USD only**, no multi-currency.

---

## 3. Updated Database Schema

Everything from the original plan stays. Additions/changes below.

### `user_profiles` (extended)
```
id (auth.users.id)
name
avatar
role            -- 'user' | 'admin'  (see Section 6 on how this becomes secure)
is_banned       boolean default false
created_at
```

### `conferences` (extended)
```
...all original fields...
slug            text unique, indexed        -- e.g. "asia-rise-and-lead-womens-leadership"
mode            enum: 'in_person' | 'virtual' | 'hybrid'
venue_name      text        -- shown only if mode is in_person/hybrid
virtual_url     text        -- shown only if mode is virtual/hybrid, gated (see 3.5)
virtual_platform text       -- e.g. "Zoom", "Hopin"
```

Your CSV already has `slug`, `start_date`, `end_date`, `themes` (→ maps to `conference_topics`), so the migration script from CSV → DB is straightforward:
- One row per conference → `conferences` table
- `themes` JSON array → explode into `conference_topics` rows
- `category` column → lookup/insert into `categories`, link via `conference_categories`

### `speaker_packages` (new)
```
id
conference_id
name              -- e.g. "Standard", "VIP", "Virtual Access"
description
price             numeric(10,2)     -- always USD, no currency column needed
attendance_mode   enum: 'in_person' | 'virtual'   -- which delivery this package grants
perks             jsonb   -- ["Lunch included", "Networking session", ...]
capacity          integer nullable   -- null = unlimited
seats_sold        integer default 0
sale_starts_at    timestamptz nullable
sale_ends_at      timestamptz nullable
is_active         boolean default true
created_at
```
*(Everything on this platform is priced in USD — no `currency` column, no conversion logic, one less thing to get wrong.)*

### `orders` (new)
```
id
user_id
stripe_customer_id
stripe_checkout_session_id
stripe_payment_intent_id
amount            -- USD
status            enum: 'pending' | 'paid' | 'failed'    -- no 'refunded' — refunds/cancellations aren't a website feature
created_at
updated_at
```

### `event_managers` (new)
```
id
company_id        -- which partner company this person works for
name
email
phone
is_active
created_at
```
Each partner company has one or more event managers on file. When a registration is confirmed, one gets assigned to look after that attendee.

### `registrations` (new)
```
id
order_id
conference_id
speaker_package_id
user_id
attendance_mode     enum: 'in_person' | 'virtual'
status              enum: 'pending' | 'confirmed'   -- no 'cancelled': once confirmed it stays confirmed on your platform
event_manager_id     -- assigned once status = 'confirmed'
created_at
```

Why split `orders` from `registrations`: one Stripe checkout could later cover multiple items (e.g. a package + a companion ticket). Keeping them separate avoids a painful schema change later.

**Event manager assignment logic:** when the `stripe-webhook` Edge Function confirms a registration, it also picks an `event_manager` belonging to that conference's `company_id` (simplest rule: round-robin by whoever has the fewest currently-assigned confirmed registrations) and sets `registrations.event_manager_id`. The attendee then sees "Your event manager: Jane Doe — jane@company.com" on their registration confirmation and in "My Conferences." Everything after that — delivering the promised benefits, handling questions, any changes — is a conversation between the attendee and that event manager, outside your platform.

### `blogs` (new)
```
id
author_id         -- user_profiles.id
title
slug              unique, indexed
cover_image_url
excerpt
content           text  -- store as sanitized HTML or JSON (see 3.6 below on editor choice)
status            enum: 'draft' | 'pending' | 'published' | 'rejected'
admin_note        text nullable   -- INTERNAL ONLY, never shown to the author
published_at      timestamptz nullable
created_at
updated_at
```

Author-facing rejection message is **not stored per post** — it's a fixed, diplomatic string shown by the frontend whenever `status = 'rejected'`, e.g.:

> "Your blog post doesn't meet our content guidelines and can't be published at this time. If you have questions, please reach out to **blogs@yourdomain.com**."

`admin_note` is just for your own team's internal reference (e.g. "spam link in paragraph 3") — it's never exposed to the API response an author's own page reads from.

### `blog_categories` / `blog_category_map` (optional, mirrors conference categories pattern)

### `audit_logs` (new, recommended)
```
id
admin_id
action            -- e.g. "conference.publish", "blog.reject", "user.ban"
target_table
target_id
metadata          jsonb
created_at
```
Cheap to add now, very useful once more than one admin exists — you'll want to know who approved/rejected/edited what.

---

### 3.5 Handling the "virtual link should be gated" requirement

Since your conferences are hybrid, the actual Zoom/streaming link is sensitive — you don't want it visible to someone who hasn't paid or registered. Two ways to do this with Supabase, both compatible with the Node migration later:

1. **RLS-based gating (simplest):** put `virtual_url` in a separate table (`conference_access`) with a Row Level Security policy that only allows `SELECT` if a matching `registrations` row exists for `auth.uid()`.
2. **Edge Function gating (more control):** keep `virtual_url` out of any table the client can query at all; serve it only through an Edge Function that checks the caller's registration status before returning it.

Recommendation: start with (1) for simplicity, move to (2) if you ever need extra logic (e.g. only reveal the link 1 hour before the event).

### 3.6 Blog content storage

Use a rich-text editor like **TipTap** or **Lexical** on the frontend. Store content as HTML. Because this is user-generated content shown publicly, **sanitize it server-side before saving** (e.g., in an Edge Function using a library like `sanitize-html`) — never trust client-supplied HTML directly, or you open an XSS hole the moment someone's blog goes live.

---

## 4. Stripe Payment Architecture

This is the part that actually determines whether you can stay "no Node server" in Phase 1. **Stripe requires a secret key on the server side** — it can never live in the React app. Supabase Edge Functions (which run on Deno, server-side) are exactly the right tool here, and they migrate almost line-for-line to Node routes later.

```
React (paymentService.ts)
        │
        ▼
Supabase Edge Function: create-checkout-session
        │  - looks up speaker_packages price server-side (NEVER trust a price from the client)
        │  - creates a Stripe Checkout Session
        │  - creates a pending `orders` row
        ▼
Stripe Checkout (hosted page)
        │
        ▼
Supabase Edge Function: stripe-webhook
        │  - verifies Stripe signature
        │  - on checkout.session.completed:
        │       - marks `orders.status = 'paid'`
        │       - creates/confirms `registrations` row
        │       - decrements `speaker_packages.capacity` (if capacity-limited)
        │       - assigns an `event_manager` from the conference's company (round-robin)
        ▼
PostgreSQL (via Supabase client inside the Edge Function)
```

**Critical security rule:** the checkout session amount is always computed server-side from the `speaker_packages` table inside the Edge Function — the client only ever sends a `package_id`, never an amount. This prevents a tampered request from buying a $500 VIP package for $1.

Edge Functions needed:
- `create-checkout-session` — input: `{ package_id, attendance_mode }`, output: Stripe Checkout URL
- `stripe-webhook` — receives Stripe events, updates `orders`/`registrations`, assigns event manager

That's it — **no refund function**, since cancellations/refunds aren't a website feature. If a refund is ever warranted, it's handled manually by your team directly in the Stripe Dashboard, outside the app.

When you migrate to Node.js later: these two functions become two Express/Fastify routes with almost identical bodies — swap `Deno.serve` for `app.post(...)` and the Supabase client call for your ORM/pg call. The Stripe SDK calls themselves don't change at all.

---

## 5. Admin Panel Spec

### 5.1 Authentication & Role Security

Supabase Auth alone doesn't know about your `role` column by default — you have to make sure `role` is trustworthy inside Row Level Security policies, not just checked in the React UI (a user could otherwise open dev tools and see admin-only data if RLS doesn't enforce it).

Recommended setup:
1. Add `role` to `user_profiles` (default `'user'`).
2. Write a **Postgres RLS policy** on every admin-writable table (`companies`, `conferences`, `categories`, `speaker_packages`) that checks:
   ```sql
   role = 'admin'  -- looked up from user_profiles for auth.uid()
   ```
3. Optionally use a **Supabase Auth Hook** ("Customize Access Token") to embed `role` directly into the JWT, so RLS policies don't need a join on every request — faster and cleaner.
4. In React, guard `/admin/*` routes with a check against the profile's role, purely for UX (hiding the nav item) — **the real security is the RLS policy, never the frontend check.**

### 5.2 Admin Panel Features (Phase-appropriate scope)

- **Dashboard:** counts of conferences, companies, pending blogs, recent orders/revenue
- **Companies:** create/edit/deactivate, logo/banner upload
- **Conferences:** create/edit, manage `conference_topics`, image gallery, set `mode` (in_person/virtual/hybrid), publish/unpublish, feature/unfeature
- **Speaker Packages:** create/edit per conference, set price (USD)/capacity/sale window
- **Categories:** CRUD
- **Blog Moderation Queue:** list of `pending` blogs → approve (sets `published_at`, status `published`) or reject (status `rejected`; optional internal `admin_note` for your own records — author only ever sees the fixed generic message)
- **Orders & Registrations:** list orders/registrations, filter by status, see which event manager is assigned to each attendee, reassign an event manager if needed — no refund action here (handle refunds manually in Stripe Dashboard if it ever comes up)
- **Event Managers:** CRUD per company (name, email, phone, active/inactive)
- **Users:** view, ban/unban, promote to admin (careful — gate this action itself behind an extra confirmation, it's the most sensitive one)
- **Audit Log Viewer:** searchable log of all admin actions

### 5.3 Why an internal-only admin panel (not a public CMS)

Since content is 100% managed by you and your 7–9 partner companies (per the original plan), keep admin as a locked internal route — don't build public self-service company accounts unless you actually plan to onboard companies to manage their own listings later. If that's a future goal, it's worth flagging now so `companies` table gets an `owner_user_id` field early, even if unused for a while.

---

## 6. Hybrid Conference Support Summary

- `conferences.mode`: `in_person | virtual | hybrid`
- If `in_person` or `hybrid`: show `venue_name`, `city`, `country`, map (`latitude`/`longitude`)
- If `virtual` or `hybrid`: show `virtual_platform` publicly (e.g. "Streamed via Zoom") but gate `virtual_url` behind registration (Section 3.5)
- `speaker_packages.attendance_mode` lets one conference sell **both** an in-person ticket and a virtual-access ticket as separate packages, at separate prices — this is the natural way to model hybrid pricing without inventing a second parallel schema

---

## 7. Slug Strategy

- Every conference and every blog gets a unique `slug`, generated at creation time (e.g. from title + region, as your CSV already does: `asia-rise-and-lead-womens-leadership`) and editable by admin if a correction is needed
- All conference detail pages route as `/conferences/:slug`, not `/conferences/:id` — keeps URLs stable and readable even if you later reshuffle IDs during the Node.js migration
- Enforce uniqueness at the DB level (`unique` constraint) plus a friendly "slug already taken" check in the admin form before submit

---

## 8. Updated Folder Structure

```
src/
  components/
  pages/
    admin/                -- admin-only pages, route-guarded
  layouts/
  hooks/
  services/
    conferenceService.ts
    companyService.ts
    bookmarkService.ts
    authService.ts
    blogService.ts
    paymentService.ts
    speakerPackageService.ts
    adminService.ts
    storageService.ts
  lib/
    supabase.ts
    stripe.ts            -- client-side Stripe.js loader only (no secret key ever here)
  types/
  utils/
  constants/

supabase/
  functions/
    create-checkout-session/
    stripe-webhook/         -- also assigns event manager on confirmation
  migrations/             -- SQL migration files, portable to any Postgres instance
```

---

## 9. Migration Path to Node.js + PostgreSQL — Concrete Plan

This is worth spelling out precisely since you asked for it explicitly.

| Layer | Now (Supabase) | Later (Node.js) | Migration effort |
|---|---|---|---|
| Database | Supabase Postgres | Any Postgres (RDS, Railway, self-hosted) | `pg_dump` / `pg_restore` — trivial, it's the same Postgres |
| API | Supabase client calls inside `services/*.ts` and Edge Functions | Express/Fastify routes calling the same Postgres via `pg` or Prisma | Rewrite the *inside* of each service file only; component code is untouched because it only calls `conferenceService.getUpcoming()` etc. |
| Auth | Supabase Auth (Google OAuth) | Custom Google OAuth (Passport.js) or Auth0/NextAuth | Because you're using **Google login only** (no passwords stored), this is the easiest possible auth migration — no password reset flow to rebuild, just re-point the OAuth callback |
| Storage | Supabase Storage buckets | S3 / Cloudflare R2 | Isolated in `storageService.ts` — swap the implementation, keep the same function signatures |
| Payments | Stripe via Supabase Edge Functions | Stripe via Node routes | Copy-paste the Edge Function bodies into Express routes; Stripe SDK calls are identical, only the server framework wrapper changes |
| Row-level security | Postgres RLS policies | Enforce equivalent checks in Node middleware/service layer | RLS policies are just SQL — reusable as reference for the exact same authorization logic in application code |

**The one thing to get right from day one to make this cheap:** never let a React component import `supabase` directly to fetch data — always go through a service function. That's the whole trick. Everything else above follows from that discipline.

---

## 10. Revised Development Roadmap

### Phase 1 — Foundation
- Supabase project, Postgres schema (all tables above), RLS policies, Auth Hook for `role`
- Service layer skeleton (all files listed in Section 1), Storage buckets

### Phase 2 — Admin Panel v1 (build early — you need it to seed real content)
- Secure admin login/route guard
- Company CRUD, Conference CRUD (incl. topics, images, mode, slug), Category CRUD

### Phase 3 — Public Experience
- Home, conference listing/detail, company listing/detail, search & filters, slug-based routing

### Phase 4 — User Accounts
- Google login, bookmarks, follow companies, "My Conferences"

### Phase 5 — Blogs
- Write/edit (draft), submit for review, public blog list/detail (published only), "My Blogs" dashboard for authors
- Admin: blog moderation queue (approve/reject with reason)

### Phase 6 — Payments
- Speaker packages (admin CRUD, USD only), Stripe Checkout integration, webhook handling, registrations, gated virtual links, event manager assignment on confirmation

### Phase 7 — Admin Panel v2
- Orders/registrations view (no refund action), event manager CRUD + reassignment, user management (ban/promote), audit log viewer, dashboard stats

### Phase 8 — Future Enhancements
- Speaker profiles, sponsors, calendar export, reminders, notifications, recommendations, analytics dashboard

---

## 11. Decisions Locked In

All the open questions from the previous draft are now resolved:

- **Blog rejection:** author sees only a status badge + a fixed, diplomatic message pointing to a support email — no per-post custom reason is ever shown to them.
- **No cancellations or refunds on the website.** A paid registration is final on your platform.
- **Post-registration support is handled by the organizing company.** Every confirmed registration gets an assigned event manager (from `event_managers`, scoped to that company) who takes it from there until the attendee receives everything promised.
- **Partner companies do not get admin logins.** All company/conference/package management stays inside your internal admin panel.
- **USD only, everywhere.** No currency column, no conversion logic anywhere in pricing or payments.
