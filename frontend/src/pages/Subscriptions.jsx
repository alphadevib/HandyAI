import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Icon } from '../components/Icons'
import Message from '../components/Message'
import Spinner from '../components/Spinner'
import ToolLogo from '../components/ToolLogo'
import { usePrefs } from '../context/PrefsContext'
import { CYCLES, cycleOf, daysUntil, formatDate, formatMoney, moneyIn } from '../format'
import { Link } from '../router'

/** The user's ledger of AI plans: totals, renewals, and quick edits. */
export default function Subscriptions() {
  const { currency } = usePrefs()
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api
      .subscriptions(controller.signal)
      .then(setOverview)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  const change = async (subscription, patch) => {
    setError('')
    try {
      await api.updateSubscription(subscription.id, patch)
      setEditing(null)
      reload()
    } catch (changeError) {
      setError(changeError.message)
    }
  }

  const remove = async (subscription) => {
    setError('')
    try {
      await api.removeSubscription(subscription.id)
      reload()
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  if (!overview) {
    return error ? <Message>{error}</Message> : <Spinner label="Loading your subscriptions" />
  }

  const next = overview.nextRenewal
  const nextIn = next ? daysUntil(next.nextRenewal) : null

  return (
    <section className="page subs-page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">My subscriptions</p>
          <h1>Your AI stack</h1>
          <p className="lede">Plans you pay for, what they cost together, and when each one renews.</p>
        </div>
        <Link to="/marketplace" className="btn btn-primary">
          <Icon name="plus" size={18} /> Add from marketplace
        </Link>
      </header>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span>Active plans</span>
          <strong>{overview.activeCount}</strong>
        </div>
        <div className="stat-tile">
          <span>Monthly spend</span>
          <strong>{formatMoney(moneyIn(overview.monthlySpend, currency), currency)}</strong>
        </div>
        <div className="stat-tile">
          <span>Per year</span>
          <strong>{formatMoney(moneyIn(overview.annualSpend, currency), currency)}</strong>
        </div>
        <div className="stat-tile">
          <span>Next renewal</span>
          <strong>{next ? next.tool.name : '—'}</strong>
          {next && (
            <small>
              {formatDate(next.nextRenewal)}
              {nextIn !== null && ` · ${nextIn === 0 ? 'today' : `in ${nextIn} day${nextIn === 1 ? '' : 's'}`}`}
            </small>
          )}
        </div>
      </div>

      <Message>{error}</Message>

      {overview.subscriptions.length === 0 ? (
        <div className="empty-state">
          <Icon name="wallet" size={36} />
          <h3>No subscriptions tracked yet</h3>
          <p>
            Open any tool in the marketplace and choose <strong>Track subscription</strong> to add
            a plan you pay for.
          </p>
          <Link to="/marketplace" className="btn btn-primary">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <ul className="subs-list">
          {overview.subscriptions.map((subscription) => {
            const active = subscription.status === 'ACTIVE'
            const days = daysUntil(subscription.nextRenewal)
            return (
              <li key={subscription.id} className={`sub-row ${active ? '' : 'is-cancelled'}`}>
                <div className="sub-tool">
                  <ToolLogo tool={subscription.tool} size={44} />
                  <div>
                    <Link to={`/tools/${subscription.tool.slug}`} className="sub-name">
                      {subscription.tool.name}
                    </Link>
                    <span className="sub-category">{subscription.tool.categoryName}</span>
                  </div>
                </div>

                <div className="sub-plan">
                  <strong>
                    {formatMoney(subscription.amount, subscription.currency)}
                    <span className="per">{cycleOf(subscription.billingCycle).short}</span>
                  </strong>
                  <span>
                    {cycleOf(subscription.billingCycle).label} · ≈
                    {formatMoney(moneyIn(subscription.monthlyEquivalent, currency), currency)}/mo
                  </span>
                </div>

                <div className="sub-renewal">
                  {active ? (
                    <>
                      <span>Renews {formatDate(subscription.nextRenewal)}</span>
                      {days !== null && days <= 7 && <span className="pill pill-warning">In {days} days</span>}
                    </>
                  ) : (
                    <span className="pill pill-muted">Cancelled</span>
                  )}
                </div>

                <div className="sub-actions">
                  <a
                    className="btn btn-secondary btn-sm"
                    href={subscription.tool.websiteUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Manage on site <Icon name="external" size={14} />
                  </a>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditing(editing === subscription.id ? null : subscription.id)}
                    aria-expanded={editing === subscription.id}
                  >
                    Edit
                  </button>
                </div>

                {editing === subscription.id && (
                  <EditSubscription
                    subscription={subscription}
                    onSave={(patch) => change(subscription, patch)}
                    onToggleStatus={() => change(subscription, { status: active ? 'CANCELLED' : 'ACTIVE' })}
                    onRemove={() => remove(subscription)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="fine-print">
        HandyAI only keeps a record of your plans. Billing and cancellation happen on each
        vendor&apos;s site; mark a plan cancelled here once you have cancelled it there.
      </p>
    </section>
  )
}

function EditSubscription({ subscription, onSave, onToggleStatus, onRemove }) {
  const [cycle, setCycle] = useState(subscription.billingCycle)
  const [amount, setAmount] = useState(String(subscription.amount))
  const [startDate, setStartDate] = useState(subscription.startDate)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const active = subscription.status === 'ACTIVE'

  return (
    <form
      className="sub-edit"
      onSubmit={(event) => {
        event.preventDefault()
        const patch = { startDate }
        if (cycle !== subscription.billingCycle) patch.billingCycle = cycle
        // A changed cycle with an untouched amount lets the server re-price from the catalogue.
        if (Number(amount) !== subscription.amount || cycle === subscription.billingCycle) {
          patch.amount = Number(amount)
        }
        onSave(patch)
      }}
    >
      <label className="field">
        <span>Billing cycle</span>
        <select value={cycle} onChange={(event) => setCycle(event.target.value)}>
          {CYCLES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Amount ({subscription.currency})</span>
        <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <label className="field">
        <span>Started on</span>
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm">
          Save
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onToggleStatus}>
          {active ? 'Mark as cancelled' : 'Reactivate'}
        </button>
        {confirmRemove ? (
          <>
            <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>
              Yes, remove it
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(true)}>
            Remove
          </button>
        )}
      </div>
    </form>
  )
}
