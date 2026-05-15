import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import Navbar from '../components/Navbar'
import Stat from '../ui/Stat'
import TrustBadge from '../ui/TrustBadge'
import usePublicStats from '../hooks/usePublicStats'
// Pull design tokens from the central theme so a future palette swap
// is one file. Previously every color in this page was a hardcoded hex.
import { colors } from '../theme'

const PACKAGES = [
  {
    id: 'starter',
    label: 'Starter',
    credits: 100,
    price: '$4.99',
    popular: false,
    perks: ['100 applications', 'All job sources', 'AI form filling', 'CAPTCHA handling'],
  },
  {
    id: 'pro',
    label: 'Pro',
    credits: 500,
    price: '$14.99',
    popular: true,
    perks: ['500 applications', 'All job sources', 'AI form filling', 'CAPTCHA handling', 'Priority support'],
  },
  {
    id: 'power',
    label: 'Power',
    credits: 2000,
    price: '$29.99',
    popular: false,
    perks: ['2,000 applications', 'All job sources', 'AI form filling', 'CAPTCHA handling', 'Priority support', 'Best value per credit'],
  },
]

export default function Pricing() {
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(null) // package id being purchased
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()
  const { stats: publicStats, loading: publicStatsLoading } = usePublicStats()

  useEffect(() => {
    api.get('/jobs/stats').then(r => {
      setStats(r.data)
      setCredits(r.data.credits ?? null)
    }).catch(() => {})

    // Show success message if redirected after payment
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setTimeout(() => api.get('/jobs/stats').then(r => setCredits(r.data.credits)), 2000)
    }
  }, [])

  const purchase = async (pkgId) => {
    setLoading(pkgId)
    try {
      const res = await api.post(`/credits/checkout/${pkgId}`)
      const url = res.data?.checkout_url
      // SECURITY: only allow redirects to the real Stripe checkout host.
      // An open-redirect via a compromised backend would otherwise let an
      // attacker bounce paying users to a phishing page.
      if (typeof url === 'string' && /^https:\/\/checkout\.stripe\.com\//.test(url)) {
        window.location.href = url
      } else {
        toast.error('Could not start checkout. Please try again later.')
        setLoading(null)
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      // Never surface backend env-var instructions to end users.
      const userMsg = (typeof detail === 'string' && !detail.toLowerCase().includes('stripe_'))
        ? detail
        : 'Payments are temporarily unavailable. Please try again later.'
      toast.error(userMsg)
      setLoading(null)
    }
  }

  const isSuccess = new URLSearchParams(window.location.search).get('payment') === 'success'

  return (
    <div style={s.page}>
      <Navbar credits={credits ?? stats?.credits ?? 0} />

      <div style={s.container}>
        {isSuccess && (
          <div style={s.successBanner}>
            ✅ Payment successful! Credits have been added to your account.
          </div>
        )}

        <div style={s.hero}>
          <div style={s.heroEyebrow}>Simple, honest pricing</div>
          <h1 style={s.heroTitle}>
            Pay only for <span style={s.heroAccent}>applications that land</span>
          </h1>
          <p style={s.heroSub}>
            Each successful application uses <strong>0.4 credits</strong>. If the bot fails or
            gets blocked, you're <strong>not charged</strong>. New accounts start with 100 free credits.
          </p>
          {credits !== null && (
            <div style={s.balancePill}>
              ⚡ Your balance: <strong>{credits} credits</strong> ({Math.floor(credits / 0.4)} applications remaining)
            </div>
          )}

          {/* Trust strip — visible to logged-in users above the pricing cards. */}
          <div style={s.trustStrip}>
            <TrustBadge icon="🔒" label="Stripe-secured checkout" tone="success" />
            <TrustBadge icon="🛡️" label="No charge on bot failures" />
            <TrustBadge icon="↺" label="Credits never expire" />
            <TrustBadge icon="✉" label="7-day refund guarantee" />
          </div>
        </div>

        {/* Real-time platform stats — quiet social proof. */}
        <div style={s.publicStats}>
          <Stat
            value={publicStats?.applications_submitted}
            label="Total applications submitted"
            loading={publicStatsLoading || publicStats?.applications_submitted == null}
            size="lg"
          />
          <div style={s.statDividerV} />
          <Stat
            value={publicStats?.applications_submitted_today}
            label="Applications today"
            loading={publicStatsLoading || publicStats?.applications_submitted_today == null}
            size="lg"
          />
          <div style={s.statDividerV} />
          <Stat
            value={publicStats?.success_rate_7d_pct}
            label="7-day success rate"
            suffix={publicStats?.success_rate_7d_pct != null ? '%' : ''}
            loading={publicStatsLoading || publicStats?.success_rate_7d_pct == null}
            size="lg"
          />
        </div>

        <div style={s.cards}>
          {PACKAGES.map(pkg => (
            <div key={pkg.id} style={{ ...s.card, ...(pkg.popular ? s.cardPopular : {}) }}>
              {pkg.popular && <div style={s.popularBadge}>Most Popular</div>}
              <div style={s.cardLabel}>{pkg.label}</div>
              <div style={s.cardPrice}>{pkg.price}</div>
              <div style={s.cardCredits}>{pkg.credits.toLocaleString()} credits</div>
              <div style={s.cardSub}>≈ {Math.floor(pkg.credits / 0.4).toLocaleString()} applications</div>
              <ul style={s.perks}>
                {pkg.perks.map(p => (
                  <li key={p} style={s.perk}><span style={s.check}>✓</span>{p}</li>
                ))}
              </ul>
              <button
                style={{ ...s.buyBtn, ...(pkg.popular ? s.buyBtnPopular : {}) }}
                onClick={() => purchase(pkg.id)}
                disabled={loading === pkg.id}
              >
                {loading === pkg.id ? 'Redirecting...' : `Get ${pkg.credits} Credits`}
              </button>
            </div>
          ))}
        </div>

        <div style={s.faq}>
          <h2 style={s.faqTitle}>How credits work</h2>
          <div style={s.faqGrid}>
            {[
              ['What counts as a credit?', '0.4 credits are deducted only when an application is successfully submitted in Live Mode. Dry runs are always free.'],
              ['Do credits expire?', 'No — credits never expire. Buy once, use whenever.'],
              ['What if an application fails?', "If the bot can't submit (CAPTCHA, form error, etc.), no credits are deducted."],
              ['Can I get a refund?', 'Yes, contact us within 7 days if you\'re not satisfied.'],
            ].map(([q, a]) => (
              <div key={q} style={s.faqItem}>
                <div style={s.faqQ}>{q}</div>
                <div style={s.faqA}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'transparent' },
  container: { maxWidth: '960px', margin: '0 auto', padding: '40px 16px 80px' },
  successBanner: { background: colors.successSoft, border: `1px solid ${colors.successBorder}`, color: '#15803d', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', textAlign: 'center' },
  hero: { textAlign: 'center', marginBottom: '32px' },
  heroEyebrow: {
    display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: colors.brandAccent,
    background: colors.brandSoft, padding: '6px 14px',
    borderRadius: 999, border: `1px solid ${colors.brandBorder}`, marginBottom: 14,
  },
  heroTitle: { fontSize: '40px', fontWeight: '800', color: colors.textPrimary, marginBottom: '14px', letterSpacing: '-0.02em', lineHeight: 1.12 },
  heroAccent: {
    // Pink isn't a brand token (only used as a gradient accent here).
    background: `linear-gradient(90deg, ${colors.brandAccent}, #EC4899)`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  heroSub: { fontSize: '16px', color: colors.textMuted, marginBottom: '20px', maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 },
  balancePill: { display: 'inline-block', background: colors.brandSoft, color: colors.textBrand, padding: '10px 24px', borderRadius: '999px', fontSize: '15px', border: `1px solid ${colors.brandBorder}` },
  trustStrip: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    gap: 10, marginTop: 22,
  },
  publicStats: {
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    background: colors.surfaceSoft, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
    border: `1px solid ${colors.borderSoft}`, borderRadius: 16,
    padding: '24px 16px', marginBottom: 36,
    flexWrap: 'wrap', gap: 16,
  },
  statDividerV: {
    width: 1, height: 50, background: colors.border, alignSelf: 'center',
  },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '60px' },
  // `#e8e5ff` is a softer brand border than the token's #C4B5FD — kept
  // intentionally because pricing cards want a quieter edge than the
  // standard brandBorder pill. If theme.js ever adds `brandBorderSoft`,
  // swap to that.
  card: { background: colors.surface, borderRadius: '16px', padding: '32px 24px', border: '1px solid #e8e5ff', display: 'flex', flexDirection: 'column', position: 'relative' },
  cardPopular: { border: `2px solid ${colors.brand}`, boxShadow: '0 8px 32px rgba(79,70,229,0.15)' },
  popularBadge: { position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: colors.brand, color: colors.textOnDark, fontSize: '12px', fontWeight: '700', padding: '4px 16px', borderRadius: '999px', whiteSpace: 'nowrap' },
  cardLabel: { fontSize: '14px', fontWeight: '600', color: colors.brandLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' },
  cardPrice: { fontSize: '40px', fontWeight: '800', color: colors.textPrimary, marginBottom: '4px' },
  cardCredits: { fontSize: '20px', fontWeight: '700', color: colors.brand, marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: colors.textMuted, marginBottom: '24px' },
  perks: { listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 },
  perk: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: colors.textSecondary, marginBottom: '10px' },
  check: { color: colors.success, fontWeight: '700', flexShrink: 0 },
  buyBtn: { background: colors.textPrimary, color: colors.textOnDark, border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' },
  buyBtnPopular: { background: colors.brand },
  faq: { background: colors.surface, borderRadius: '16px', padding: '40px', border: '1px solid #e8e5ff' },
  faqTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '28px', textAlign: 'center' },
  faqGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  faqItem: { padding: '20px', background: colors.brandSofter, borderRadius: '12px' },
  faqQ: { fontSize: '14px', fontWeight: '700', color: colors.textPrimary, marginBottom: '8px' },
  faqA: { fontSize: '14px', color: colors.textSecondary, lineHeight: '1.6' },
}
