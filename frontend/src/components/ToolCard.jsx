const PRICING_LABELS = {
  FREE: 'Free',
  FREEMIUM: 'Free tier',
  TRIAL: 'Free trial',
  PAID: 'Paid',
}

export default function ToolCard({ tool, reasons, matchScore, onToggleFavorite, busy }) {
  return (
    <article className="tool-card">
      <header className="tool-card-head">
        <span className="tool-icon" aria-hidden="true">
          {tool.categoryIcon ?? '✨'}
        </span>
        <div className="tool-heading">
          <h3>{tool.name}</h3>
          <p className="tool-category">{tool.categoryName}</p>
        </div>
        {typeof matchScore === 'number' && (
          <span className="match-score" title="How well this fits what you described">
            {matchScore}% match
          </span>
        )}
      </header>

      <p className="tool-tagline">{tool.tagline}</p>
      <p className="tool-description">{tool.description}</p>

      {reasons?.length > 0 && (
        <ul className="tool-reasons">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="tool-tags">
        <span className={`pill pricing-${tool.pricingModel.toLowerCase()}`}>
          {PRICING_LABELS[tool.pricingModel] ?? tool.pricingModel}
        </span>
        {tool.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="pill pill-muted">
            {tag}
          </span>
        ))}
        {tool.ratingCount > 0 && (
          <span className="pill pill-muted" aria-label={`Rated ${tool.rating} out of 5`}>
            {'★'} {tool.rating} ({tool.ratingCount})
          </span>
        )}
      </div>

      <footer className="tool-card-foot">
        {tool.priceNote && <span className="price-note">{tool.priceNote}</span>}
        <div className="tool-actions">
          <button
            type="button"
            className={`btn btn-icon ${tool.favorite ? 'is-active' : ''}`}
            onClick={() => onToggleFavorite?.(tool)}
            disabled={busy}
            aria-pressed={tool.favorite}
            title={tool.favorite ? 'Remove from your list' : 'Save to your list'}
          >
            {tool.favorite ? '❤' : '♡'}
            <span className="sr-only">
              {tool.favorite ? 'Saved' : 'Save'} {tool.name}
            </span>
          </button>
          <a
            className="btn btn-secondary"
            href={tool.websiteUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Visit site
          </a>
        </div>
      </footer>
    </article>
  )
}
