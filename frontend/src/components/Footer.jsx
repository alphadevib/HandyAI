import { Link } from '../router'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand">
            Handy<strong>AI</strong>
          </p>
          <p className="footer-note">
            A curated map of the AI platforms that quietly make a workday shorter.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href="/#discover">Discover</a>
          <a href="/#categories">Categories</a>
          <a href="/#match">Find my tools</a>
          <Link to="/login">Sign in</Link>
        </nav>
      </div>
      <p className="footer-copy">Built with React and Spring Boot.</p>
    </footer>
  )
}
