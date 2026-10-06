import { vendorLink } from '../api/client'
import { usePrefs } from '../context/PrefsContext'
import { visitorId } from '../visitor'
import { PRICING_LABELS, annualSaving, priceLabel } from '../format'
import { Link } from '../router'
import { Icon } from './Icons'
import ToolLogo from './ToolLogo'

/**
 * A marketplace listing. Guests see the same card as members: the price in their chosen currency
 * and billing cycle, a link to the full listing and a button straight to the vendor's site.
 */
export default function ProductCard({
  tool,
  reasons,
  matchScore,
  onToggleFavorite,
  busy,
  compact,
  source = 'card',
}) {
  const { currency, cycle } = usePrefs()
  const price = priceLabel(tool, currency, cycle)
  const saving = cycle === 'ANNUAL' ? annualSaving(tool) : 0

  return (
    <article className={`product-card ${compact ? 'is-compact' : ''}`}>
      <header className="product-head">
        <ToolLogo tool={tool} size={compact ? 40 : 48} />
        <div className="product-title">
          <h3>
            <Link to={`/tools/${tool.slug}`} className="stretched">
              {tool.name}
            </Link>
          </h3>
          <p className="product-category">{tool.categoryName}</p>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            className={`icon-btn save-btn ${tool.favorite ? 'is-active' : ''}`}
            onClick={() => onToggleFavorite(tool)}
            disabled={busy}
            aria-pressed={tool.favorite}
            title={tool.favorite ? 'Saved to your list' : 'Save to your list'}
          >
            <Icon name="heart" size={20} />
            <span className="sr-only">
              {tool.favorite ? 'Remove' : 'Save'} {tool.name}
            </span>
          </button>
        )}
      </header>

      <p className="product-tagline">{tool.tagline}</p>

      {typeof matchScore === 'number' && (
        <p className="match-line">
          <span className="match-score">{matchScore}% match</span>
          {reasons?.[0] && <span className="match-reason">{reasons[0]}</span>}
        </p>
      )}

      <div className="product-meta">
        <span className={`pill pricing-${tool.pricingModel.toLowerCase()}`}>
          {PRICING_LABELS[tool.pricingModel] ?? tool.pricingModel}
        </span>
        {tool.ratingCount > 0 && (
          <span className="pill pill-muted" aria-label={`Rated ${tool.rating} out of 5`}>
            ★ {tool.rating}
          </span>
        )}
      </div>

      <footer className="product-foot">
        <div className="product-price">
          {price ? (
            <>
              <span className="price-from">{tool.plans?.paidPlanAvailable ? 'Paid plan' : 'Price'}</span>
              <strong>{price}</strong>
              {saving > 0 && <span className="saving">Save {saving}%</span>}
            </>
          ) : (
            <span className="price-from">Price on vendor site</span>
          )}
        </div>
        <a
          className="btn btn-primary btn-sm"
          href={vendorLink(tool.slug, source, visitorId())}
          target="_blank"
          rel="noreferrer noopener"
        >
          {tool.hasFreePlan ? 'Try it' : 'Buy'}
          <Icon name="external" size={16} />
        </a>
      </footer>
    </article>
  )
}
