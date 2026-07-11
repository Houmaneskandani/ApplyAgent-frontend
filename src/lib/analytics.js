/**
 * PostHog analytics — minimal funnel + pageview instrumentation.
 *
 * Design notes:
 *  - Everything no-ops if `VITE_POSTHOG_KEY` is unset, so local dev and
 *    Vercel preview deploys don't pollute the production project.
 *  - `person_profiles: 'identified_only'` is the GDPR-friendly default:
 *    anonymous traffic doesn't get profile rows in PostHog. We only
 *    create profiles after the user explicitly logs in / signs up.
 *  - We capture pageviews MANUALLY via React Router's useLocation hook,
 *    so we get one event per route change (PostHog's auto-capture would
 *    miss SPA navigation because the document never reloads).
 *  - Every public function wraps PostHog calls in try/catch — analytics
 *    must never crash the app.
 */
// posthog-js is ~61KB gzip — loaded lazily so it never blocks first paint.
// `_ph` resolves to the real module after init; every call falls through to
// a no-op until then (identical behavior to the unset-key case).
let _ph = null

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let _initialized = false

export async function initAnalytics() {
  if (_initialized) return
  if (!POSTHOG_KEY) return  // intentional no-op when env var is unset
  try {
    const mod = await import('posthog-js')
    _ph = mod.default
    _ph.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // We send pageviews manually from PageviewTracker (App.jsx).
      capture_pageview: false,
      // Only build a person profile after we call `identify()` — keeps
      // pre-login traffic anonymous.
      person_profiles: 'identified_only',
      // Don't send raw localStorage / browser noise.
      disable_session_recording: true,
    })
    _initialized = true
  } catch (e) {
    // Bad PostHog key, network blocked by adblock, etc. — silent fail.
    console.warn('[analytics] PostHog init failed:', e?.message || e)
  }
}

/** Fire a custom event. Safe to call before init / without a key. */
export function track(event, props) {
  if (!POSTHOG_KEY) return
  try { _ph?.capture(event, props) } catch {}
}

/** Attach the current event stream to a user. Call on login/signup. */
export function identifyUser({ user_id, id, email, name } = {}) {
  if (!POSTHOG_KEY) return
  const distinctId = (user_id ?? id ?? '').toString()
  if (!distinctId) return
  try {
    // Pass user_id as the distinct_id; email/name are person properties.
    _ph?.identify(distinctId, {
      // Yes, email is PII. PostHog supports this; the tradeoff vs.
      // hashing is that we can debug "what did this user do" while
      // investigating an issue. Switch to a hash later if needed.
      email,
      name,
    })
  } catch {}
}

/** Clear the current user from the session. Call on logout. */
export function resetAnalytics() {
  if (!POSTHOG_KEY) return
  try { _ph?.reset() } catch {}
}

/** Manual pageview event. Called by PageviewTracker. */
export function capturePageview(path) {
  if (!POSTHOG_KEY) return
  try { _ph?.capture('$pageview', { $current_url: path }) } catch {}
}
