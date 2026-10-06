import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Icon } from '../components/Icons'
import Message from '../components/Message'
import Spinner from '../components/Spinner'

const POLL_MS = 5000

const VIEWS = [
  { value: 'dashboard', label: 'Live dashboard' },
  { value: 'suggestions', label: 'Suggestions' },
  { value: 'organisations', label: 'Verify organisations' },
]

/** The admin's console: live platform numbers and organisation verification. */
export default function Admin() {
  const [view, setView] = useState('dashboard')

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">Admin</p>
        <h1>HandyAI control room</h1>
      </header>

      <div className="tabs" role="tablist">
        {VIEWS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={view === tab.value}
            className={view === tab.value ? 'is-active' : ''}
            onClick={() => setView(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'dashboard' && <Dashboard onOpenSuggestions={() => setView('suggestions')} />}
      {view === 'suggestions' && <Suggestions />}
      {view === 'organisations' && <Organisations />}
    </section>
  )
}

const number = new Intl.NumberFormat('en-IN')
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })

function ago(iso, now) {
  const seconds = Math.max(0, Math.round((now - new Date(iso)) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`
  return timeFormat.format(new Date(iso))
}

/**
 * Polls the stats every few seconds while the tab is visible. Polling rather than a socket keeps
 * it working behind Vercel's proxy and any host's load balancer without special configuration.
 */
function Dashboard({ onOpenSuggestions }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let controller = null
    const load = () => {
      if (document.visibilityState !== 'visible') return
      controller?.abort()
      controller = new AbortController()
      api
        .adminStats(controller.signal)
        .then((result) => {
          setStats(result)
          setError('')
        })
        .catch((loadError) => {
          if (loadError.name !== 'AbortError') setError(loadError.message)
        })
    }
    load()
    const poll = setInterval(load, POLL_MS)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    document.addEventListener('visibilitychange', load)
    return () => {
      controller?.abort()
      clearInterval(poll)
      clearInterval(tick)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  if (!stats) return error ? <Message>{error}</Message> : <Spinner label="Loading live numbers" />

  const { live, users, redirects, subscriptions } = stats
  const maxClicks = Math.max(1, ...redirects.topTools.map((tool) => tool.clicks))

  return (
    <div className="dashboard">
      <p className="live-line">
        <span className="live-dot" aria-hidden="true" /> Live · updated {ago(stats.generatedAt, now)}
        {error && <span className="live-error"> · {error}</span>}
      </p>

      <div className="kpi-grid">
        <div className="kpi kpi-live">
          <span className="kpi-label">
            <Icon name="user" size={18} /> Live users now
          </span>
          <strong>{number.format(live.total)}</strong>
          <span className="kpi-sub">
            {live.signedIn} signed in · {live.guests} guests
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">
            <Icon name="external" size={18} /> Purchase redirects
          </span>
          <strong>{number.format(redirects.total)}</strong>
          <span className="kpi-sub">
            {redirects.today} today · {redirects.last24Hours} in 24h · {redirects.bySignedInUsers} by members
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">
            <Icon name="spark" size={18} /> Registered users
          </span>
          <strong>{number.format(users.total)}</strong>
          <span className="kpi-sub">
            {users.today} today · {users.last7Days} this week
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">
            <Icon name="wallet" size={18} /> Tracked subscriptions
          </span>
          <strong>{number.format(subscriptions.active)}</strong>
          <span className="kpi-sub">
            active · {subscriptions.addedToday} added today · {subscriptions.cancelled} cancelled
          </span>
        </div>
        <button type="button" className="kpi kpi-button" onClick={onOpenSuggestions}>
          <span className="kpi-label">
            <Icon name="chat" size={18} /> New suggestions
          </span>
          <strong>{number.format(stats.newSuggestions)}</strong>
          <span className="kpi-sub">Open the suggestion box →</span>
        </button>
      </div>

      <div className="dashboard-cols">
        <section className="panel">
          <h2>Most redirected tools · 30 days</h2>
          {redirects.topTools.length === 0 ? (
            <p className="muted">No redirects yet. They appear when visitors click Buy or Try it.</p>
          ) : (
            <ul className="bar-list">
              {redirects.topTools.map((tool) => (
                <li key={tool.slug}>
                  <span className="bar-name">{tool.name}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(tool.clicks / maxClicks) * 100}%` }} />
                  </span>
                  <span className="bar-value">{tool.clicks}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="sub-head">Accounts</h3>
          <dl className="mini-stats">
            <div>
              <dt>Individuals</dt>
              <dd>{number.format(users.individuals)}</dd>
            </div>
            <div>
              <dt>Organisations</dt>
              <dd>{number.format(users.organisations)}</dd>
            </div>
            <div>
              <dt>Awaiting verification</dt>
              <dd>{number.format(users.pendingOrganisations)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h2>Recent activity</h2>
          {stats.recent.length === 0 ? (
            <p className="muted">Nothing yet.</p>
          ) : (
            <ul className="activity">
              {stats.recent.map((item) => (
                <li key={`${item.type}-${item.at}-${item.text}`} className={`activity-${item.type}`}>
                  <span className="activity-dot" aria-hidden="true" />
                  <span className="activity-text">{item.text}</span>
                  <time dateTime={item.at}>{ago(item.at, now)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="fine-print">
        A purchase redirect is a visitor sent from HandyAI to a vendor&apos;s site with a Buy or Try
        it button. Whether they then paid happens on the vendor&apos;s site and is not reported back;
        confirmed sales need an affiliate programme with each vendor. Tracked subscriptions are
        plans members recorded in My subscriptions.
      </p>
    </div>
  )
}

const SUGGESTION_TABS = [
  { value: 'NEW', label: 'New' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'DONE', label: 'Done' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

const CATEGORY_LABELS = {
  IDEA: 'Idea',
  TOOL_REQUEST: 'Tool request',
  BUG: 'Bug',
  OTHER: 'Other',
}

/** The suggestion box, readable only here. Each item moves New → Planned → Done, or Dismissed. */
function Suggestions() {
  const [status, setStatus] = useState('NEW')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    api
      .suggestions(status, controller.signal)
      .then(setItems)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
    return () => controller.abort()
  }, [status])

  const move = async (item, next) => {
    setError('')
    try {
      await api.updateSuggestion(item.id, next)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
    } catch (moveError) {
      setError(moveError.message)
    }
  }

  return (
    <>
      <p className="lede">
        Ideas, tool requests and bug reports from visitors. Only you can see this list.
      </p>
      <div className="tabs tabs-sm" role="tablist">
        {SUGGESTION_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={status === tab.value ? 'is-active' : ''}
            onClick={() => {
              setItems(null)
              setStatus(tab.value)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Message>{error}</Message>

      {items === null ? (
        <Spinner label="Loading suggestions" />
      ) : items.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        <ul className="suggestion-list">
          {items.map((item) => (
            <li key={item.id} className="panel suggestion">
              <div className="suggestion-head">
                <span className={`pill suggestion-${item.category.toLowerCase()}`}>
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="muted">
                  {item.memberName
                    ? `${item.memberName} · ${item.memberEmail}`
                    : item.email
                      ? `Guest · ${item.email}`
                      : 'Guest'}
                  {item.page && ` · on ${item.page}`} · {ago(item.createdAt, now)}
                </span>
              </div>
              <p className="suggestion-text">{item.message}</p>
              <div className="form-actions">
                {status !== 'PLANNED' && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(item, 'PLANNED')}>
                    Plan it
                  </button>
                )}
                {status !== 'DONE' && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => move(item, 'DONE')}>
                    Mark done
                  </button>
                )}
                {status !== 'DISMISSED' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(item, 'DISMISSED')}>
                    Dismiss
                  </button>
                )}
                {status !== 'NEW' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(item, 'NEW')}>
                    Back to new
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

function Organisations() {
  const [status, setStatus] = useState('PENDING')
  const [organisations, setOrganisations] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api
      .organisations(status, controller.signal)
      .then(setOrganisations)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
    return () => controller.abort()
  }, [status, reloadKey])

  const act = async (action) => {
    setError('')
    try {
      await action()
      setReloadKey((key) => key + 1)
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  return (
    <>
      <p className="lede">
        Each request already passed the automatic checks: a work email on the organisation&apos;s
        domain and a well-formed GSTIN, CIN or LLPIN. Confirm the registration before approving.
      </p>
      <div className="tabs tabs-sm" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={status === tab.value ? 'is-active' : ''}
            onClick={() => {
              setOrganisations(null)
              setStatus(tab.value)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Message>{error}</Message>

      {organisations === null ? (
        <Spinner label="Loading organisations" />
      ) : organisations.length === 0 ? (
        <p className="muted">No organisations here.</p>
      ) : (
        <ul className="org-list">
          {organisations.map((org) => (
            <OrganisationRow
              key={org.id}
              org={org}
              onApprove={() => act(() => api.approveOrganisation(org.id))}
              onReject={(reason) => act(() => api.rejectOrganisation(org.id, reason))}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function OrganisationRow({ org, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <li className="panel org-row">
      <div className="org-details">
        <h3>{org.organisationName}</h3>
        <dl>
          <dt>Website</dt>
          <dd>
            <a href={org.organisationWebsite} target="_blank" rel="noreferrer noopener">
              {org.organisationWebsite}
            </a>
          </dd>
          <dt>Registration</dt>
          <dd>
            <code>{org.organisationRegistrationId}</code>
          </dd>
          <dt>Contact</dt>
          <dd>
            {org.name} · {org.email}
          </dd>
          <dt>Industry</dt>
          <dd>{org.profession ?? '—'}</dd>
          {org.verificationNote && (
            <>
              <dt>Rejection reason</dt>
              <dd>{org.verificationNote}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="org-actions">
        {org.verificationStatus !== 'VERIFIED' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onApprove}>
            Approve
          </button>
        )}
        {org.verificationStatus !== 'REJECTED' &&
          (rejecting ? (
            <form
              className="reject-form"
              onSubmit={(event) => {
                event.preventDefault()
                onReject(reason)
              }}
            >
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason shown to the organisation"
                maxLength={300}
                required
                autoFocus
              />
              <button type="submit" className="btn btn-danger btn-sm">
                Reject
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejecting(true)}>
              Reject…
            </button>
          ))}
      </div>
    </li>
  )
}
