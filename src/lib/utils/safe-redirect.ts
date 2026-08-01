/**
 * Whitelist for `?next=` redirects.
 *
 * `value.startsWith("/")` is not enough: `//evil.com` and `/\evil.com` are
 * protocol-relative URLs that browsers happily navigate off-site, which turns a
 * login page into an open redirect — the classic setup for a phishing link that
 * looks like it points at our own domain.
 *
 * The test is a positive allowlist rather than a blocklist, so control
 * characters (the usual way a scheme gets smuggled past a naive check) cannot
 * pass by simply not being on anyone's list of bad bytes.
 */
const SAFE_PATH = /^\/[A-Za-z0-9\-._~%/?#[\]@!$&'()*+,;=]*$/;

export function safeNextPath(value: string | null | undefined, fallback = "/panel"): string {
  if (!value) return fallback;

  const path = value.trim();
  if (!SAFE_PATH.test(path)) return fallback;
  // Second character decides: "//" escapes to another origin entirely.
  if (path.startsWith("//")) return fallback;

  return path;
}

/**
 * Guard for URLs the API hands us to navigate to (payment gateways).
 *
 * These come from the bridge, which builds them from its own WHMCS config, so
 * this is defence in depth rather than distrust — but `window.location.href` is
 * a script-execution sink for `javascript:` and `data:` URLs, and a redirect
 * target is exactly the kind of value that quietly changes shape one day.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
