import { Link } from '../router'
import { BrandMark, Wordmark } from './Brand'
import { openSuggestions } from './SuggestionDialog'

/* global __APP_BUILD__ */

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand">
            <BrandMark size={30} />
            <Wordmark />
          </span>
          <p className="footer-note">
            The marketplace for AI tools, matched to the work you actually do.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/categories">Categories</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/chat">AI Chat</Link>
          <Link to="/subscriptions">My subscriptions</Link>
          <button type="button" className="text-link" onClick={openSuggestions}>
            Suggest a feature
          </button>
        </nav>
      </div>
      <p className="footer-copy">
        Prices are indicative list prices of each tool&apos;s entry plan; rupee amounts are converted
        at a fixed rate. Purchases happen on the vendor&apos;s own website. · v{__APP_BUILD__.version}
      </p>
    </footer>
  )
}
