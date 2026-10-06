import { useEffect, useState } from 'react'
import { BrandMark } from '../components/Brand'
import { Icon } from '../components/Icons'
import Message from '../components/Message'
import ProfessionSelect from '../components/ProfessionSelect'
import { useAuth } from '../context/AuthContext'
import { Link, navigate } from '../router'

const EMPTY = {
  name: '',
  email: '',
  password: '',
  profession: '',
  accountType: 'INDIVIDUAL',
  organisationName: '',
  organisationWebsite: '',
  organisationRegistrationId: '',
}

/** Only same-site paths are honoured, so a crafted history entry cannot send people elsewhere. */
function safeReturnTo(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/'
}

export default function Login({ mode = 'login' }) {
  const { login, register, isAuthenticated } = useAuth()
  const isSignup = mode === 'signup'

  // Whoever sent the visitor here can explain why and say where to go back to afterwards.
  const [{ notice, returnTo }] = useState(() => {
    const state = window.history.state ?? {}
    return { notice: state.notice ?? '', returnTo: safeReturnTo(state.returnTo) }
  })

  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isOrganisation = isSignup && form.accountType === 'ORGANISATION'

  // Someone who is already signed in has no business on this screen. This also runs right after
  // a successful sign in or sign up, and replaces the entry so Back does not return to the form.
  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true })
  }, [isAuthenticated, returnTo])

  // Switching between the two modes clears whatever the other form complained about.
  const [lastMode, setLastMode] = useState(mode)
  if (lastMode !== mode) {
    setLastMode(mode)
    setFieldErrors({})
    setError('')
  }

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }
  const update = (key) => (event) => set(key, event.target.value)

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
          accountType: form.accountType,
          ...(isOrganisation && {
            organisationName: form.organisationName.trim(),
            organisationWebsite: form.organisationWebsite.trim(),
            organisationRegistrationId: form.organisationRegistrationId.trim(),
          }),
        })
      } else {
        await login({ email: form.email.trim(), password: form.password })
      }
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

  const fieldError = (key) =>
    fieldErrors[key] && <small className="field-error">{fieldErrors[key]}</small>

  return (
    <section className="auth">
      <div className="auth-card">
        <header className="auth-head">
          <BrandMark size={44} />
          <h1>{isSignup ? 'Create your HandyAI profile' : 'Welcome back'}</h1>
          <p>
            {isSignup
              ? 'Tell us what you do and the marketplace will lead with the tools that fit.'
              : 'Sign in to see your picks, saved tools and subscriptions.'}
          </p>
        </header>

        {!error && <Message tone="info">{notice}</Message>}
        <Message>{error}</Message>

        <form onSubmit={onSubmit} noValidate>
          {isSignup && (
            <div className="segmented" role="radiogroup" aria-label="Account type">
              {[
                { value: 'INDIVIDUAL', label: 'Individual', hint: 'For yourself' },
                { value: 'ORGANISATION', label: 'Organisation', hint: 'Company or team, verified' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={form.accountType === option.value}
                  className={form.accountType === option.value ? 'is-active' : ''}
                  onClick={() => {
                    set('accountType', option.value)
                    set('profession', '')
                  }}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          )}

          {isSignup && (
            <label className="field">
              <span>{isOrganisation ? 'Your name (account admin)' : 'Name'}</span>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                placeholder="Alex Carter"
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldError('name')}
            </label>
          )}

          <label className="field">
            <span>{isOrganisation ? 'Work email' : 'Email'}</span>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              inputMode="email"
              placeholder={isOrganisation ? 'you@yourcompany.com' : 'you@example.com'}
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {isOrganisation && !fieldErrors.email && (
              <small className="field-hint">Must be on your organisation&apos;s own domain.</small>
            )}
            {fieldError('email')}
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
            {fieldError('password')}
          </label>

          {isSignup && (
            <label className="field" htmlFor="profession">
              <span>{isOrganisation ? 'Industry' : 'Profession'}</span>
              <ProfessionSelect
                id="profession"
                kind={isOrganisation ? 'industry' : 'profession'}
                value={form.profession}
                onChange={(value) => set('profession', value)}
                invalid={Boolean(fieldErrors.profession)}
              />
              {fieldErrors.profession ? (
                fieldError('profession')
              ) : (
                <small className="field-hint">Used to pick your tools. You can change it any time.</small>
              )}
            </label>
          )}

          {isOrganisation && (
            <fieldset className="org-fields">
              <legend>
                <Icon name="shield" size={18} /> Organisation verification
              </legend>
              <label className="field">
                <span>Registered name</span>
                <input
                  type="text"
                  value={form.organisationName}
                  onChange={update('organisationName')}
                  placeholder="Acme Technologies Pvt Ltd"
                  aria-invalid={Boolean(fieldErrors.organisationName)}
                />
                {fieldError('organisationName')}
              </label>
              <label className="field">
                <span>Website</span>
                <input
                  type="text"
                  inputMode="url"
                  value={form.organisationWebsite}
                  onChange={update('organisationWebsite')}
                  placeholder="acme.com"
                  aria-invalid={Boolean(fieldErrors.organisationWebsite)}
                />
                {fieldError('organisationWebsite')}
              </label>
              <label className="field">
                <span>GSTIN, CIN or LLPIN</span>
                <input
                  type="text"
                  value={form.organisationRegistrationId}
                  onChange={update('organisationRegistrationId')}
                  placeholder="27AAPFU0939F1ZV"
                  autoCapitalize="characters"
                  aria-invalid={Boolean(fieldErrors.organisationRegistrationId)}
                />
                {fieldError('organisationRegistrationId')}
              </label>
              <p className="field-hint">
                We check the details automatically, then a HandyAI admin verifies your organisation.
                You can use the marketplace while it is pending.
              </p>
            </fieldset>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Just a moment…' : isSignup ? 'Create profile' : 'Sign in'}
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
              Already have an account?{' '}
              <Link to="/login" state={{ notice, returnTo }}>
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link to="/signup" state={{ notice, returnTo }}>
                Create a free profile
              </Link>
            </>
          )}
        </p>
        <p className="auth-switch">
          <Link to={returnTo}>Keep browsing as a guest</Link>
        </p>
      </div>

      <aside className="auth-aside" aria-label="Why sign up">
        <h2>What a profile gets you</h2>
        <ul>
          <li>
            <Icon name="spark" size={20} />
            <span>
              <strong>Picks for your profession.</strong> 60 professions and 25 industries, each
              mapped to the tools that matter for that work.
            </span>
          </li>
          <li>
            <Icon name="wallet" size={20} />
            <span>
              <strong>All your subscriptions in one place.</strong> See what you spend each month
              and when each plan renews.
            </span>
          </li>
          <li>
            <Icon name="shield" size={20} />
            <span>
              <strong>Verified organisations.</strong> Teams get a verified badge once an admin
              confirms their registration.
            </span>
          </li>
        </ul>
        <p className="auth-aside-note">Browsing the marketplace and the AI Chat work without an account.</p>
      </aside>
    </section>
  )
}
