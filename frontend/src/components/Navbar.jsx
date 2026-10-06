import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { Link, navigate, useRoute } from '../router'
import { BrandMark, Wordmark } from './Brand'
import { Icon } from './Icons'
import ThemeToggle from './ThemeToggle'

const PRIMARY = [
  { to: '/categories', label: 'Categories', icon: 'grid' },
  { to: '/marketplace', label: 'Marketplace', icon: 'store' },
  { to: '/chat', label: 'AI Chat', icon: 'chat' },
]

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { currency, setCurrency } = usePrefs()
  const path = useRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [lastPath, setLastPath] = useState(path)
  const accountRef = useRef(null)

  // Neither menu should survive a navigation, including the browser's Back button.
  if (lastPath !== path) {
    setLastPath(path)
    setMenuOpen(false)
    setAccountOpen(false)
  }

  useEffect(() => {
    if (!accountOpen) return undefined
    const close = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const onKey = (event) => event.key === 'Escape' && setAccountOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  const signOut = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="HandyAI home">
          <BrandMark size={34} />
          <Wordmark />
        </Link>

        <nav id="primary-navigation" className={`nav-primary ${menuOpen ? 'is-open' : ''}`}>
          {PRIMARY.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${path.startsWith(item.to) ? 'is-active' : ''}`}
              aria-current={path.startsWith(item.to) ? 'page' : undefined}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="nav-drawer-auth">
              <Link to="/login" className="btn btn-secondary">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Join free
              </Link>
            </div>
          )}
        </nav>

        <div className="nav-tools">
          <ThemeToggle />
          <div className="currency-switch" role="group" aria-label="Currency">
            {['INR', 'USD'].map((code) => (
              <button
                key={code}
                type="button"
                className={currency === code ? 'is-active' : ''}
                aria-pressed={currency === code}
                onClick={() => setCurrency(code)}
              >
                <span aria-hidden="true">{code === 'INR' ? '₹' : '$'}</span>
                <span className="currency-code">{code}</span>
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <div className="account" ref={accountRef}>
              <button
                type="button"
                className="account-button"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span className="avatar" aria-hidden="true">
                  {(user?.name ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="account-name">{user?.name?.split(' ')[0]}</span>
              </button>
              {accountOpen && (
                <div className="account-menu" role="menu">
                  <p className="account-menu-head">
                    <strong>{user?.name}</strong>
                    <span>{user?.organisationName ?? user?.profession ?? user?.email}</span>
                  </p>
                  <Link to="/profile" role="menuitem">
                    <Icon name="user" size={18} /> My profile
                  </Link>
                  <Link to="/subscriptions" role="menuitem">
                    <Icon name="wallet" size={18} /> My subscriptions
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" role="menuitem">
                      <Icon name="shield" size={18} /> Admin dashboard
                    </Link>
                  )}
                  <button type="button" role="menuitem" onClick={signOut}>
                    <Icon name="logout" size={18} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Join free
              </Link>
            </div>
          )}

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            <span className={`burger ${menuOpen ? 'is-open' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
