import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { Icon } from '../components/Icons'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import ProfessionSelect from '../components/ProfessionSelect'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useFavoriteToggle } from '../hooks'
import { Link } from '../router'

const STATUS = {
  PENDING: { label: 'Verification pending', tone: 'warning', text: 'A HandyAI admin is reviewing your details.' },
  VERIFIED: { label: 'Verified organisation', tone: 'success', text: 'Your organisation has been verified.' },
  REJECTED: { label: 'Verification rejected', tone: 'danger', text: 'Fix the details below and save to resubmit.' },
}

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const isOrganisation = user.accountType === 'ORGANISATION'

  const [name, setName] = useState(user.name)
  const [profession, setProfession] = useState(user.profession ?? '')
  const [org, setOrg] = useState({
    organisationName: user.organisationName ?? '',
    organisationWebsite: user.organisationWebsite ?? '',
    organisationRegistrationId: user.organisationRegistrationId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saved, setSaved] = useState('')

  const [favorites, setFavorites] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    api.favorites(controller.signal).then(setFavorites).catch(() => setFavorites([]))
    return () => controller.abort()
  }, [])
  const apply = useCallback(
    (update) => setFavorites((items) => items.map(update).filter((tool) => tool.favorite)),
    [],
  )
  const favoriteToggle = useFavoriteToggle(apply)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    setSaved('')
    try {
      const orgChanged =
        isOrganisation &&
        (org.organisationName !== (user.organisationName ?? '') ||
          org.organisationWebsite !== (user.organisationWebsite ?? '') ||
          org.organisationRegistrationId !== (user.organisationRegistrationId ?? '') ||
          user.verificationStatus === 'REJECTED')
      const updated = await updateProfile({
        name: name.trim(),
        profession: profession.trim(),
        ...(orgChanged && org),
      })
      setSaved(
        orgChanged && updated.verificationStatus === 'PENDING'
          ? 'Saved. Your organisation details were sent for verification again.'
          : 'Your profile is saved. Your picks now follow your new profession.',
      )
    } catch (saveError) {
      setError(saveError.message)
      setFieldErrors(saveError.fieldErrors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const status = STATUS[user.verificationStatus]

  return (
    <section className="page profile-page">
      <header className="page-head">
        <p className="eyebrow">My profile</p>
        <h1>{user.organisationName ?? user.name}</h1>
        <p className="lede">
          {user.email}
          {status && (
            <span className={`status-badge ${status.tone}`}>
              <Icon name={user.verificationStatus === 'VERIFIED' ? 'shield' : 'calendar'} size={14} />
              {status.label}
            </span>
          )}
        </p>
      </header>

      <div className="profile-layout">
        <form className="panel" onSubmit={submit}>
          <h2>{isOrganisation ? 'Organisation profile' : 'Your details'}</h2>
          <Message>{error}</Message>
          <Message tone="success">{saved}</Message>

          <label className="field">
            <span>{isOrganisation ? 'Account admin name' : 'Name'}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
          </label>

          <label className="field" htmlFor="profile-profession">
            <span>{isOrganisation ? 'Industry' : 'Profession'}</span>
            <ProfessionSelect
              id="profile-profession"
              kind={isOrganisation ? 'industry' : 'profession'}
              value={profession}
              onChange={setProfession}
              invalid={Boolean(fieldErrors.profession)}
            />
            <small className="field-hint">The marketplace and AI Chat put tools for this first.</small>
          </label>

          {isOrganisation && (
            <fieldset className="org-fields">
              <legend>
                <Icon name="shield" size={18} /> Verification details
              </legend>
              {status && (
                <p className={`status-note ${status.tone}`}>
                  {status.text}
                  {user.verificationNote && (
                    <>
                      <br />
                      <strong>Reason:</strong> {user.verificationNote}
                    </>
                  )}
                </p>
              )}
              {[
                ['organisationName', 'Registered name'],
                ['organisationWebsite', 'Website'],
                ['organisationRegistrationId', 'GSTIN, CIN or LLPIN'],
              ].map(([key, label]) => (
                <label key={key} className="field">
                  <span>{label}</span>
                  <input
                    value={org[key]}
                    onChange={(event) => setOrg((current) => ({ ...current, [key]: event.target.value }))}
                    aria-invalid={Boolean(fieldErrors[key])}
                  />
                  {fieldErrors[key] && <small className="field-error">{fieldErrors[key]}</small>}
                </label>
              ))}
              {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
              <p className="field-hint">Changing these sends your organisation for verification again.</p>
            </fieldset>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <aside className="profile-side">
          <Link to="/subscriptions" className="panel side-link">
            <Icon name="wallet" size={24} />
            <span>
              <strong>My subscriptions</strong>
              <span>See and manage the AI plans you pay for</span>
            </span>
          </Link>
          <Link to="/chat" className="panel side-link">
            <Icon name="chat" size={24} />
            <span>
              <strong>Ask the AI Chat</strong>
              <span>Get tool picks for a specific task</span>
            </span>
          </Link>
        </aside>
      </div>

      <section className="section">
        <header className="section-head">
          <h2>Saved tools</h2>
        </header>
        <Message>{favoriteToggle.error}</Message>
        {favorites === null ? (
          <Spinner label="Loading saved tools" />
        ) : favorites.length === 0 ? (
          <p className="muted">
            Nothing saved yet. Tap the heart on any tool in the <Link to="/marketplace">marketplace</Link>.
          </p>
        ) : (
          <div className="product-grid">
            {favorites.map((tool) => (
              <ProductCard
                key={tool.slug}
                tool={tool}
                busy={favoriteToggle.busySlug === tool.slug}
                onToggleFavorite={favoriteToggle.toggle}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
