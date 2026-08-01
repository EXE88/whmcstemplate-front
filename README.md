# LithiumHost — storefront & client area

Next.js (App Router) frontend for the **WHMCS Bridge API**. The browser never
talks to WHMCS, and never talks to the bridge directly either: every request
goes through this app's own BFF layer.

```bash
cp .env.example .env.local   # then check NEXT_PUBLIC_CURRENCY_DISPLAY
npm install
npm run dev                  # http://localhost:3000
```

---

## Architecture

```
browser ──► /api/bff/*  ──►  Django bridge  ──►  WHMCS
            /api/auth/*
```

### 1. Session lives in httpOnly cookies, not in JavaScript

`src/server/session.ts` + `src/app/api/`

* `POST /api/auth/login|register` consume the bridge's token pair and turn it
  into three cookies: `lh_at` (access, 15 min, httpOnly), `lh_rt` (refresh,
  14 days, httpOnly) and `lh_user` (email + client id, readable, grants
  nothing). The tokens never reach client JavaScript, so an XSS cannot steal a
  14-day refresh token.
* `/api/bff/[...path]` proxies everything else. It attaches the bearer token,
  and on a `401` it refreshes **once**, writes the rotated pair back to the
  cookies, and retries the original request. Concurrent 401s queue on a single
  in-flight refresh (`refreshTokens`), because rotation would invalidate every
  other parallel attempt. A second 401 clears the session and answers
  `session_expired`, which the client turns into a redirect to `/login`.
* Because the proxy is same-origin, there is no CORS surface and no API base URL
  in the browser bundle.

### 2. Typed API layer

`src/lib/api/`

| file            | role                                                              |
| --------------- | ----------------------------------------------------------------- |
| `types.ts`      | Response shapes, derived from the bridge's normalisers (the OpenAPI file types many endpoints as bare `object`). Money is always `string`, dates always ISO strings. |
| `errors.ts`     | `ApiError` — one class for the bridge's single error envelope (`code`, `message`, `details`, `request_id`). |
| `client.ts`     | `request()` / `downloadFile()` against the BFF. No tokens, no retry logic. |
| `endpoints.ts`  | One typed function per endpoint, grouped by domain.                |

`src/lib/query/` holds the TanStack Query wiring: `keys.ts` (central key
registry, so post-mutation invalidation is never guesswork), `hooks.ts` (one
hook per endpoint), `provider.tsx` (retry only transport failures and 504 — a
4xx from the bridge is a decision, not a hiccup).

### 3. Money and dates are never `number` / `Date`

`src/lib/format/`

* `decimal.ts` does arithmetic on digit strings: parse, shift the decimal point,
  half-up round, compare, group thousands. `"1250000.00"` is never passed
  through `Number`.
* `NEXT_PUBLIC_CURRENCY_DISPLAY` maps the stored WHMCS unit to the displayed
  one in exactly one place — `toman` (Rial ÷ 10), `rial`, or `toman_direct`.
  **Verify this against one product price in WHMCS admin**; the wrong value is
  off by a factor of ten.
* `jalali.ts` is a self-contained Gregorian ↔ Solar Hijri converter. Persian UI
  shows Jalali dates and Persian digits; English UI shows Gregorian and Latin.

### 4. The basket carries no prices

`src/lib/cart/store.ts` (Zustand + `persist`)

It records *what* is being bought. Prices shown next to a line are read live
from the catalogue at render time, so a stale basket can never misquote. The
order body has no `priceoverride` field — it does not exist in the API.

`idempotencyKey` is minted once per basket state and persisted with it. Every
mutation (add, remove, cycle change, promo code, nameservers) rotates it. A
double-clicked pay button therefore replays the first order instead of buying
twice. On `order_outcome_unknown` the basket is marked `blocked` and the pay
button never re-enables — the customer is sent to check their orders instead.

### 5. Payment is always a redirect

There is no card field anywhere in this codebase. Checkout and upgrades follow
`payment_url` from the bridge; invoices link to theirs.

### 6. i18n, theme, RTL

Locale (`fa` default, `en`) and theme are cookies read on the server in
`src/server/request-context.ts`, so the first HTML already carries the right
`lang`, `dir` and `.dark` class — no flash, no layout shift. `fa.ts` is the
source of truth for the key set; `en.ts` is typed against it, so a missing
translation is a build error.

Direction-sensitive styling uses Tailwind's `ltr:` / `rtl:` variants and logical
properties throughout; no page has a hardcoded left or right.

### 7. Design system

`src/components/ui/` — glassmorphism over an animated aurora backdrop, driven by
CSS custom properties defined once per theme in `globals.css` (`--glass-*`,
`--field-*`, `--aurora-*`). Components never hardcode a colour. Icons are
Bootstrap Icons (self-hosted font), never emoji. Vazirmatn is self-hosted via
`@fontsource-variable/vazirmatn`; nothing loads from a CDN.

Every list state is written once in `ListShell` (loading / empty / error /
paginated) and every panel list uses it.

---

## Layout

```
src/
  app/
    (store)/          landing, plans, domains, cart, checkout   + store chrome
    (auth)/           login, register                           + minimal chrome
    panel/            dashboard, services, domains, invoices,
                      transactions, orders, tickets, profile    + sidebar shell
    api/auth/*        login / register / logout — cookie writers
    api/bff/[...path] authenticated proxy to the bridge
  components/
    layout/           header, footer, panel shell, brand
    store/            plan grid, domain search
    panel/            list shell, attachment picker
    ui/               button, card, field, badge, modal, toast, pagination…
  lib/
    api/ cart/ catalog/ format/ i18n/ query/ support/ theme/ session/ utils/
  server/             session cookies, request context (server-only)
```

## Notes on this install

* **zibal is the only enabled gateway.** The checkout reads the gateway list
  from the API and hides the selector when there is exactly one.
* **TLD pricing is empty.** `/domains` says so plainly and still runs
  availability lookups; it does not render a broken price table.
* **Products priced `0.00`** (the configurable VPS plan) are shown as "priced by
  configuration" with the buy button disabled, rather than as free. WHMCS prices
  those through configurable options, which this API version does not expose —
  when `config_options` metadata is added to `/hosting/products/`, the plan card
  and the cart line are the two places to extend.
* **Login is email + password**, matching the API. `src/app/(auth)/login/page.tsx`
  is written as a step machine with one step so an OTP stage is an addition
  rather than a rewrite; the session response already carries
  `two_factor_enabled`.

## Scripts

```bash
npm run dev        # dev server on :3000
npm run build      # production build
npm run start      # serve the build
npm run typecheck  # tsc --noEmit
```
