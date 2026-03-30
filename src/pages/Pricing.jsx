import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import Navbar from '../components/Navbar'

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
      window.location.href = res.data.checkout_url
    } catch (err) {
      const msg = err.response?.data?.detail || 'Payment setup failed'
      if (msg.includes('not configured')) {
        alert('Payments are not configured yet. Add your STRIPE_SECRET_KEY to the backend .env file.')
      } else {
        alert(msg)
      }
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
          <h1 style={s.heroTitle}>Get More Credits</h1>
          <p style={s.heroSub}>Each successful application uses <strong>0.4 credits</strong>. New accounts start with 100 free credits.</p>
          {credits !== null && (
            <div style={s.balancePill}>
              ⚡ Your balance: <strong>{credits} credits</strong> ({Math.floor(credits / 0.4)} applications remaining)
            </div>
          )}
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
  page: { minHeight: '100vh', background: '#F5F3FF' },
  container: { maxWidth: '960px', margin: '0 auto', padding: '40px 16px 80px' },
  successBanner: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', textAlign: 'center' },
  hero: { textAlign: 'center', marginBottom: '48px' },
  heroTitle: { fontSize: '36px', fontWeight: '800', color: '#111', marginBottom: '12px' },
  heroSub: { fontSize: '16px', color: '#666', marginBottom: '20px' },
  balancePill: { display: 'inline-block', background: '#EDE9FE', color: '#5B21B6', padding: '10px 24px', borderRadius: '999px', fontSize: '15px', border: '1px solid #C4B5FD' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '60px' },
  card: { background: '#fff', borderRadius: '16px', padding: '32px 24px', border: '1px solid #e8e5ff', display: 'flex', flexDirection: 'column', position: 'relative' },
  cardPopular: { border: '2px solid #4F46E5', boxShadow: '0 8px 32px rgba(79,70,229,0.15)' },
  popularBadge: { position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: '#4F46E5', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '4px 16px', borderRadius: '999px', whiteSpace: 'nowrap' },
  cardLabel: { fontSize: '14px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' },
  cardPrice: { fontSize: '40px', fontWeight: '800', color: '#111', marginBottom: '4px' },
  cardCredits: { fontSize: '20px', fontWeight: '700', color: '#4F46E5', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#888', marginBottom: '24px' },
  perks: { listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 },
  perk: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#444', marginBottom: '10px' },
  check: { color: '#16a34a', fontWeight: '700', flexShrink: 0 },
  buyBtn: { background: '#111', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' },
  buyBtnPopular: { background: '#4F46E5' },
  faq: { background: '#fff', borderRadius: '16px', padding: '40px', border: '1px solid #e8e5ff' },
  faqTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '28px', textAlign: 'center' },
  faqGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  faqItem: { padding: '20px', background: '#F5F3FF', borderRadius: '12px' },
  faqQ: { fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '8px' },
  faqA: { fontSize: '14px', color: '#555', lineHeight: '1.6' },
}
