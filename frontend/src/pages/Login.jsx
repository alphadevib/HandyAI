import { useEffect, useState } from 'react'
import Message from '../components/Message'
import { useAuth } from '../context/AuthContext'
import { Link, navigate } from '../router'

const EMPTY = { name: '', email: '', password: '', profession: '' }

export default function Login({ mode = 'login' }) {
  const { login, register, isAuthenticated } = useAuth()
  const isSignup = mode === 'signup'

  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Someone who is already signed in has no business on this screen.
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated])

  // Switching between the two modes clears whatever the other form complained about.
  const [lastMode, setLastMode] = useState(mode)
  if (lastMode !== mode) {
    setLastMode(mode)
    setFieldErrors({})
    setError('')
  }

  const update = (key) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setFieldErrors({})
    try {
      if (isSignup) {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          profession: form.profession.trim(),
        })
      } else {
        await login({ email: form.email.trim(), password: form.password })
      }
      navigate('/')
    } catch (submitError) {
      setError(submitError.message)
      setFieldErrors(submitError.fieldErrors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  const useDemoAccount = () => {
    setForm({ ...EMPTY, email: 'demo@handyai.app', password: 'demo12345' })
    setError('')
    setFieldErrors({})
  }

  return (
    <section className="auth">
      <div className="auth-card">
        <header className="auth-head">
          <h1>{isSignup ? 'Create your HandyAI account' : 'Welcome back'}</h1>
          <p>
            {isSignup
              ? 'Save the tools you like and get suggestions shaped by what you actually use.'
              : 'Sign in to pick up your saved tools and personalised matches.'}
          </p>
        </header>

        <Message>{error}</Message>

        <form onSubmit={onSubmit} noValidate>
          {isSignup && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                placeholder="Alex Carter"
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
          </label>

          <label className="field">
            <span>Password</span>
            <span className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                required
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
            {fieldErrors.password && (
              <small className="field-error">{fieldErrors.password}</small>
            )}
          </label>

          {isSignup && (
            <label className="field">
              <span>What do you do? (optional)</span>
              <input
                type="text"
                value={form.profession}
                onChange={update('profession')}
                placeholder="Designer, teacher, founder…"
                maxLength={120}
              />
              <small className="field-hint">Used to tune your suggestions. Change it anytime.</small>
            </label>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Just a moment…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!isSignup && (
          <button type="button" className="btn btn-ghost btn-block" onClick={useDemoAccount}>
            Fill in the demo account
          </button>
        )}

        <p className="auth-switch">
          {isSignup ? (
            <>
              Already have an account? <Link to="/login">Sign in</Link>
            </>
          ) : (
            <>
              New here? <Link to="/signup">Create a free account</Link>
            </>
          )}
        </p>
        <p className="auth-switch">
          <Link to="/">Keep browsing without an account</Link>
        </p>
      </div>

      <aside className="auth-aside" aria-label="Why sign up">
        <h2>Why bother signing in?</h2>
        <ul>
          <li>
            <strong>Keep a shortlist.</strong> Save anything you want to try later instead of
            re-finding it.
          </li>
          <li>
            <strong>Better matches.</strong> Suggestions lean towards the categories you already
            rate highly.
          </li>
          <li>
            <strong>Share what works.</strong> Rate a tool and help the next person skip the duds.
          </li>
        </ul>
        <p className="auth-aside-note">
          Browsing, searching and matching all work without an account.
        </p>
      </aside>
    </section>
  )
}
