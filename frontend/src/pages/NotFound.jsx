import { Link } from '../router'

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1>That page does not exist</h1>
      <p>The link may be old, or the page may have moved.</p>
      <Link to="/" className="btn btn-primary btn-lg">
        Back to the home page
      </Link>
    </section>
  )
}
