import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, navigate, useRoute } from '../router'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const path = useRoute()
  const [menuPath, setMenuPath] = useState(path)

  // The mobile drawer should never survive a navigation, including a browser back button.
  if (menuPath !== path) {
    setMenuPath(path)
    setOpen(false)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="HandyAI home">
          <span className="brand-mark" aria-hidden="true">
            HA
          </span>
          <span className="brand-name">
            Handy<strong>AI</strong>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <span className={`burger ${open ? 'is-open' : ''}`} aria-hidden="true" />
        </button>

        <nav id="primary-navigation" className={`nav-links ${open ? 'is-open' : ''}`}>
          <a href="/#discover" onClick={() => setOpen(false)}>
            Discover
          </a>
          <a href="/#categories" onClick={() => setOpen(false)}>
            Categories
          </a>
          <a href="/#match" onClick={() => setOpen(false)}>
            Find my tools
          </a>

          {isAuthenticated ? (
            <div className="nav-account">
              <span className="nav-user" title={user?.email}>
                {user?.name?.split(' ')[0] ?? 'You'}
              </span>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="nav-account">
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/signup')}
              >
                Create account
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
