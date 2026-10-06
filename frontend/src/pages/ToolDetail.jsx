import { useCallback, useEffect, useState } from 'react'
import { api, vendorLink } from '../api/client'
import { visitorId } from '../visitor'
import { CategoryIcon, Icon } from '../components/Icons'
import Message from '../components/Message'
import Spinner from '../components/Spinner'
import SubscribeForm from '../components/SubscribeForm'
import ToolLogo from '../components/ToolLogo'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useFavoriteToggle } from '../hooks'
import { CYCLES, PRICING_LABELS, annualSaving, formatMoney, moneyIn, planKey } from '../format'
import { Link, goToSignIn } from '../router'
import NotFound from './NotFound'

export default function ToolDetail({ slug }) {
  const { user, isAuthenticated } = useAuth()
  const { currency } = usePrefs()
  const [tool, setTool] = useState(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState([])
  const [subscribing, setSubscribing] = useState(false)
  const [notice, setNotice] = useState('')

  // The router mounts a fresh page per slug, so there is no previous tool to clear here; this
  // only reloads when signing in or out changes the saved flag.
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api.tool(slug, controller.signal), api.reviews(slug, controller.signal)])
      .then(([toolResult, reviewResult]) => {
        setTool(toolResult)
        setReviews(reviewResult)
      })
      .catch((loadError) => {
        if (loadError.name === 'AbortError') return
        if (loadError.status === 404) setMissing(true)
        else setError(loadError.message)
      })
    return () => controller.abort()
  }, [slug, isAuthenticated])

  const apply = useCallback((update) => setTool((current) => (current ? update(current) : current)), [])
  const favorites = useFavoriteToggle(apply)

  if (missing) return <NotFound />
  if (!tool) return error ? <Message>{error}</Message> : <Spinner label="Loading tool" />

  const saving = annualSaving(tool)
  const startSubscribing = () => {
    if (!isAuthenticated) {
      goToSignIn(`Sign in to add ${tool.name} to your subscriptions.`)
      return
    }
    setSubscribing(true)
    setNotice('')
  }

  return (
    <article className="page tool-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/marketplace">Marketplace</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/marketplace?category=${tool.categorySlug}`}>{tool.categoryName}</Link>
        <span aria-hidden="true">/</span>
        <span>{tool.name}</span>
      </nav>

      <div className="tool-layout">
        <div className="tool-main">
          <header className="tool-hero">
            <ToolLogo tool={tool} size={72} />
            <div>
              <h1>{tool.name}</h1>
              <p className="tool-hero-tagline">{tool.tagline}</p>
              <div className="product-meta">
                <span className="pill pill-muted">
                  <CategoryIcon slug={tool.categorySlug} size={14} /> {tool.categoryName}
                </span>
                <span className={`pill pricing-${tool.pricingModel.toLowerCase()}`}>
                  {PRICING_LABELS[tool.pricingModel]}
                </span>
                {tool.ratingCount > 0 && (
                  <span className="pill pill-muted">
                    ★ {tool.rating} · {tool.ratingCount} {tool.ratingCount === 1 ? 'review' : 'reviews'}
                  </span>
                )}
              </div>
            </div>
          </header>

          <section className="panel">
            <h2>About {tool.name}</h2>
            <p>{tool.description}</p>
            <div className="tag-list">
              {tool.tags.map((tag) => (
                <Link key={tag} to={`/marketplace?q=${encodeURIComponent(tag)}`} className="pill pill-muted">
                  {tag}
                </Link>
              ))}
            </div>
          </section>

          <Reviews tool={tool} reviews={reviews} setReviews={setReviews} user={user} />
        </div>

        <aside className="tool-buy">
          <div className="panel buy-panel">
            <h2>Plans &amp; pricing</h2>
            {tool.plans?.paidPlanAvailable ? (
              <table className="plan-table">
                <tbody>
                  {CYCLES.map((cycle) => (
                    <tr key={cycle.value}>
                      <th scope="row">{cycle.label}</th>
                      <td>
                        <strong>{formatMoney(moneyIn(tool.plans[planKey(cycle.value)], currency), currency)}</strong>
                        <span className="per">{cycle.short}</span>
                        {cycle.value === 'ANNUAL' && saving > 0 && (
                          <span className="saving">Save {saving}%</span>
                        )}
                        {cycle.value === 'QUARTERLY' && <span className="per-note">3 × monthly</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="free-note">{tool.name} is free to use. There is no paid plan to buy.</p>
            )}
            {tool.hasFreePlan && tool.plans?.paidPlanAvailable && (
              <p className="free-note">
                <Icon name="check" size={16} /> Has a free plan to start with
              </p>
            )}
            <p className="fine-print">{tool.priceNote ? `${tool.priceNote}. ` : ''}Indicative prices; confirm on the vendor&apos;s site.</p>

            <a
              className="btn btn-primary btn-block"
              href={vendorLink(tool.slug, 'detail', visitorId())}
              target="_blank"
              rel="noreferrer noopener"
            >
              {tool.hasFreePlan ? `Get ${tool.name}` : `Buy ${tool.name}`}
              <Icon name="external" size={18} />
            </a>
            <p className="fine-print center">You will continue on {new URL(tool.websiteUrl).hostname}</p>

            <div className="buy-secondary">
              <button type="button" className="btn btn-secondary" onClick={startSubscribing}>
                <Icon name="wallet" size={18} /> Track subscription
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${tool.favorite ? 'is-active' : ''}`}
                onClick={() => favorites.toggle(tool)}
                disabled={favorites.busySlug === tool.slug}
                aria-pressed={tool.favorite}
              >
                <Icon name="heart" size={18} /> {tool.favorite ? 'Saved' : 'Save'}
              </button>
            </div>
            <Message>{favorites.error}</Message>
            <Message tone="success">{notice}</Message>

            {subscribing && (
              <div className="subscribe-box">
                <h3>Add to my subscriptions</h3>
                <SubscribeForm
                  tool={tool}
                  onCancel={() => setSubscribing(false)}
                  onDone={() => {
                    setSubscribing(false)
                    setNotice(`${tool.name} is now in My subscriptions.`)
                  }}
                />
              </div>
            )}
            {notice && (
              <Link to="/subscriptions" className="text-link">
                Manage my subscriptions
              </Link>
            )}
          </div>
        </aside>
      </div>
    </article>
  )
}

function Reviews({ tool, reviews, setReviews, user }) {
  const mine = user ? reviews.find((review) => review.userId === user.id) : null
  const [rating, setRating] = useState(mine?.rating ?? 5)
  const [comment, setComment] = useState(mine?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await api.saveReview(tool.slug, { rating, comment })
      setReviews((current) => [saved, ...current.filter((review) => review.id !== saved.id)])
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      await api.deleteReview(tool.slug, mine.id)
      setReviews((current) => current.filter((review) => review.id !== mine.id))
      setComment('')
      setRating(5)
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  return (
    <section className="panel">
      <h2>Reviews</h2>
      {user ? (
        <form className="review-form" onSubmit={submit}>
          <div className="star-input" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                className={value <= rating ? 'is-on' : ''}
                onClick={() => setRating(value)}
              >
                ★<span className="sr-only">{value} stars</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span className="sr-only">Your review</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={`What is ${tool.name} good or bad at?`}
            />
          </label>
          <Message>{error}</Message>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {mine ? 'Update review' : 'Post review'}
            </button>
            {mine && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
                Delete my review
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="muted">
          <button type="button" className="text-link" onClick={() => goToSignIn('Sign in to review tools.')}>
            Sign in
          </button>{' '}
          to rate {tool.name}.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="muted">No reviews yet. Be the first to share how it went.</p>
      ) : (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.id}>
              <p className="review-head">
                <strong>{review.userName}</strong>
                <span className="stars" aria-label={`${review.rating} out of 5`}>
                  {'★'.repeat(review.rating)}
                  <span className="stars-off">{'★'.repeat(5 - review.rating)}</span>
                </span>
              </p>
              {review.comment && <p>{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
