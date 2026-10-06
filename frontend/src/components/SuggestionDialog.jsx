import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icons'
import Message from './Message'

const CATEGORIES = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'TOOL_REQUEST', label: 'Add a tool' },
  { value: 'BUG', label: 'Something broke' },
  { value: 'OTHER', label: 'Other' },
]

export const OPEN_SUGGESTIONS_EVENT = 'handyai:suggest'

/** Any component can open the suggestion box by dispatching this event. */
export function openSuggestions() {
  window.dispatchEvent(new Event(OPEN_SUGGESTIONS_EVENT))
}

/**
 * The suggestion box. Members send under their account; guests may leave an email for a reply.
 * Suggestions are readable only by the admin.
 */
export default function SuggestionDialog() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('IDEA')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [sent, setSent] = useState(false)
  const dialog = useRef(null)

  useEffect(() => {
    const show = () => {
      setSent(false)
      setError('')
      setFieldErrors({})
      setOpen(true)
    }
    window.addEventListener(OPEN_SUGGESTIONS_EVENT, show)
    return () => window.removeEventListener(OPEN_SUGGESTIONS_EVENT, show)
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const submit = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')
    setFieldErrors({})
    try {
      await api.suggest({
        category,
        message: message.trim(),
        email: user ? undefined : email.trim() || undefined,
        page: window.location.pathname,
      })
      setSent(true)
      setMessage('')
    } catch (submitError) {
      setError(submitError.message)
      setFieldErrors(submitError.fieldErrors ?? {})
    } finally {
      setSending(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      onClose={() => setOpen(false)}
      onClick={(event) => event.target === dialog.current && setOpen(false)}
      aria-labelledby="suggest-title"
    >
      <div className="sheet-body">
        <button type="button" className="icon-btn sheet-close" onClick={() => setOpen(false)}>
          <Icon name="close" size={18} />
          <span className="sr-only">Close</span>
        </button>

        {sent ? (
          <div className="sheet-done">
            <span className="sheet-done-icon">
              <Icon name="check" size={28} />
            </span>
            <h2 id="suggest-title">Thank you!</h2>
            <p>Your suggestion went straight to the team building HandyAI.</p>
            <div className="form-actions center">
              <button type="button" className="btn btn-secondary" onClick={() => setSent(false)}>
                Send another
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="eyebrow">
              <Icon name="spark" size={14} /> Shape HandyAI
            </p>
            <h2 id="suggest-title">What should we build next?</h2>
            <p className="muted">
              Only the HandyAI team reads these. Tell us about a feature, a missing tool or a bug.
            </p>

            <div className="choice-row" role="radiogroup" aria-label="Type of suggestion">
              {CATEGORIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={category === option.value}
                  className={`chip ${category === option.value ? 'is-active' : ''}`}
                  onClick={() => setCategory(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="field">
              <span>Your suggestion</span>
              <textarea
                rows={4}
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="e.g. Add a comparison view for two tools side by side"
                required
                aria-invalid={Boolean(fieldErrors.message)}
                autoFocus
              />
              <small className="field-hint">{message.length}/1000</small>
            </label>

            {!user && (
              <label className="field">
                <span>Email (optional, if you would like a reply)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
              </label>
            )}

            <Message>{error}</Message>
            <button type="submit" className="btn btn-primary btn-block" disabled={sending || !message.trim()}>
              {sending ? 'Sending…' : 'Send suggestion'}
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}
