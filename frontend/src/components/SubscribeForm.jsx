import { useState } from 'react'
import { api } from '../api/client'
import { usePrefs } from '../context/PrefsContext'
import { CYCLES, formatMoney, moneyIn, planKey } from '../format'
import Message from './Message'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Records a plan the user bought on the vendor's site. The amount starts at the catalogue price
 * for the chosen cycle and currency, and the user can correct it to what they really pay.
 */
export default function SubscribeForm({ tool, onDone, onCancel }) {
  const prefs = usePrefs()
  const [cycle, setCycle] = useState(prefs.cycle)
  const [currency, setCurrency] = useState(prefs.currency)
  const listPrice = (nextCycle, nextCurrency) =>
    tool.plans ? moneyIn(tool.plans[planKey(nextCycle)], nextCurrency) : 0
  const [amount, setAmount] = useState(String(listPrice(prefs.cycle, prefs.currency) ?? 0))
  const [amountEdited, setAmountEdited] = useState(false)
  const [startDate, setStartDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reprice = (nextCycle, nextCurrency) => {
    if (!amountEdited) setAmount(String(listPrice(nextCycle, nextCurrency) ?? 0))
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await api.addSubscription({
        toolSlug: tool.slug,
        billingCycle: cycle,
        currency,
        amount: Number(amount),
        startDate,
      })
      onDone?.(saved)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="subscribe-form" onSubmit={submit}>
      <Message>{error}</Message>
      <div className="field-row">
        <label className="field">
          <span>Billing cycle</span>
          <select
            value={cycle}
            onChange={(event) => {
              setCycle(event.target.value)
              reprice(event.target.value, currency)
            }}
          >
            {CYCLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Currency</span>
          <select
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value)
              reprice(cycle, event.target.value)
            }}
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
          </select>
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Amount per cycle</span>
          <input
            type="number"
            min="0"
            step={currency === 'USD' ? '0.01' : '1'}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              setAmountEdited(true)
            }}
            required
          />
          <small className="field-hint">
            List price {formatMoney(listPrice(cycle, currency), currency)}. Change it if you pay a
            different amount.
          </small>
        </label>
        <label className="field">
          <span>Started on</span>
          <input
            type="date"
            value={startDate}
            max={today()}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add to my subscriptions'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
