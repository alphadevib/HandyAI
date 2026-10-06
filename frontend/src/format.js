/** Price and date formatting shared by every page, so a figure reads the same everywhere. */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export const CYCLES = [
  { value: 'MONTHLY', label: 'Monthly', short: '/mo', months: 1 },
  { value: 'QUARTERLY', label: 'Quarterly', short: '/qtr', months: 3 },
  { value: 'ANNUAL', label: 'Annual', short: '/yr', months: 12 },
]

export const cycleOf = (value) => CYCLES.find((cycle) => cycle.value === value) ?? CYCLES[0]

export function formatMoney(amount, currency) {
  if (amount === null || amount === undefined) return '—'
  return currency === 'USD' ? usd.format(amount) : inr.format(amount)
}

/** Picks the right currency out of a {usd, inr} pair from the API. */
export function moneyIn(money, currency) {
  if (!money) return null
  return currency === 'USD' ? money.usd : money.inr
}

export function planKey(cycle) {
  return { MONTHLY: 'monthly', QUARTERLY: 'quarterly', ANNUAL: 'annual' }[cycle] ?? 'monthly'
}

/** "₹1,760/mo", "Free", or null when the price is unknown. */
export function priceLabel(tool, currency, cycle) {
  if (!tool?.plans) return null
  if (!tool.plans.paidPlanAvailable) return 'Free'
  const amount = moneyIn(tool.plans[planKey(cycle)], currency)
  return `${formatMoney(amount, currency)}${cycleOf(cycle).short}`
}

/** How much the annual plan saves over paying monthly for a year, as a whole percentage. */
export function annualSaving(tool) {
  if (!tool?.plans?.paidPlanAvailable) return 0
  const yearOfMonths = tool.plans.monthly.usd * 12
  if (!yearOfMonths) return 0
  return Math.max(0, Math.round((1 - tool.plans.annual.usd / yearOfMonths) * 100))
}

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(iso) {
  if (!iso) return '—'
  return dateFormat.format(new Date(`${iso}T00:00:00`))
}

export function daysUntil(iso) {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86_400_000)
}

export const PRICING_LABELS = {
  FREE: 'Free',
  FREEMIUM: 'Free tier',
  TRIAL: 'Free trial',
  PAID: 'Paid',
}
