# LithiumHost — storefront & client area

Next.js (App Router) frontend for the **WHMCS Bridge API**. The browser never
talks to WHMCS, and never talks to the bridge directly either: every request
goes through this app's own BFF layer.

```bash
cp .env.example .env.local   # then check NEXT_PUBLIC_CURRENCY_DISPLAY
npm install
npm run dev                  # http://localhost:3000
```

Needs Node 20+ and the bridge running on `http://127.0.0.1:8000`. Without it the
catalogue renders its error state — a legitimate thing to look at, but not a
working shop.

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
  cookies, and retries the original request. A second 401 clears the session and
  answers `session_expired`, which the client turns into a redirect to `/login`.
* Because the proxy is same-origin, there is no CORS surface, and the browser
  needs no configuration to find the API — the `/api/bff` path is hardcoded in
  `client.ts`.

Rotation makes the naive "refresh on 401" wrong in two separate ways, and
`refreshTokens` handles both:

* Requests that 401 **simultaneously** would each spend the same token, and all
  but one would be rejected as blacklisted. They share one in-flight promise.
* A request that 401s a moment **later** still carries the old cookie, because
  the browser had not yet seen the rotated `Set-Cookie`. The settled result is
  kept for 30 seconds and replayed, so that straggler is not logged out for no
  reason. Failures are not cached — a dead token should not keep a recovered
  session locked out.

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

## Configuration

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Where the **server** reaches the bridge. Never sent to the browser — use an internal address. |
| `NEXT_PUBLIC_API_BASE_URL` | Fallback for the above. The `NEXT_PUBLIC_` prefix inlines it into the client bundle, so prefer `API_BASE_URL` in production and leave this on something harmless. |
| `TRUST_PROXY_HEADERS` | `true` only behind a reverse proxy you control. See below. |
| `NEXT_PUBLIC_CURRENCY_DISPLAY` | `toman` (default) · `rial` · `toman_direct` |
| `NEXT_PUBLIC_BRAND_NAME` | Header, footer and page titles. |

Both API variables point at the **bridge**. There is no variable for "the URL
the browser calls" — it always calls this app's own `/api/bff`.

Files load in Next's usual order: `.env.production` is committed and holds no
secrets; `.env.production.local` overrides it and is gitignored.

## Security posture

* **Tokens are unreachable from JavaScript** — see §1. The readable `lh_user`
  cookie carries only an email and client id and grants nothing; every response
  is scoped by the JWT the bridge validates.
* **CSRF** relies on `SameSite=Lax`, which is sufficient here because no
  state-changing operation uses `GET`. There is no CSRF token.
* **Open redirects** are closed by `lib/utils/safe-redirect.ts`. A `?next=`
  value must match a positive allowlist — `startsWith("/")` alone would let
  `//evil.com` through, since browsers read that as protocol-relative. The same
  module checks that a gateway `payment_url` is `http`/`https` before
  `window.location.href` gets it.
* **Path traversal** into the bridge is blocked in the proxy. `encodeURIComponent`
  leaves dots alone, so a `..` segment would survive escaping and `fetch` would
  normalise it afterwards — enough to climb out of `/api/v1`. Segments are
  validated, not merely escaped.
* **Client IP** is rebuilt, not forwarded. The bridge derives the customer's IP
  from `X-Forwarded-For` for login throttling and WHMCS fraud checks; since this
  app is itself a proxy, the inbound forwarding headers are stripped (they are
  browser input) and a single-entry header is written only when
  `TRUST_PROXY_HEADERS=true`. Pair that with `NUM_PROXIES = 1` in the bridge's
  `REST_FRAMEWORK` settings — without it the bridge sees this server's address
  for every customer and the login rate limit becomes global.
* **Attachment rules are mirrored, not trusted.** `lib/support/attachments.ts`
  repeats the bridge's extension and size limits so a rejected file fails
  instantly instead of after a long upload. The server remains the authority.

## Deployment

Requires a Node runtime. Shared PHP/cPanel hosting will not work, and neither
will `next export`: the cookie handling and the proxy are server-side by design.

```bash
npm ci
npm run build
npx pm2 start "npm run start" --name lithium-front
npx pm2 save && npx pm2 startup
```

Behind nginx:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

Note `$remote_addr`, not `$proxy_add_x_forwarded_for` — the latter appends
whatever the client sent, which is the spoofing vector the proxy just closed.

**TLS is mandatory.** Production cookies are set `secure: true`, so over plain
HTTP the browser discards them and login fails silently with no error to show.

For Docker, add `output: "standalone"` to `next.config.ts` and run
`node server.js` from `.next/standalone`; putting this and the bridge on one
compose network lets `API_BASE_URL` use the service name.

## Known gaps

* **No Content-Security-Policy.** Adding one to Next means nonce plumbing for
  its inline scripts — worth doing deliberately rather than in passing.
* **Refresh de-duplication is per-process.** Several Node instances behind a
  load balancer would each keep their own map; a shared cache would be needed if
  that deployment shape ever matters.
* **No automated tests.** The money helpers in `lib/format/decimal.ts` are pure
  functions with awkward edge cases (carry propagation, decimal shifting) and
  are the obvious first thing to cover.

## Scripts

```bash
npm run dev        # dev server on :3000
npm run build      # production build
npm run start      # serve the build
npm run typecheck  # tsc --noEmit
```
