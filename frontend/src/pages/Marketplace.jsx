import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { CategoryIcon, Icon } from '../components/Icons'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import { usePrefs } from '../context/PrefsContext'
import { useFavoriteToggle } from '../hooks'
import { CYCLES, formatMoney } from '../format'
import { useQuery } from '../router'

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
  { value: 'name', label: 'A to Z' },
]

const PAGE_SIZE = 12

/**
 * "INR:1001-2000" → {currency, min, max}. The currency is part of the value so switching from
 * rupees to dollars cannot silently reinterpret a rupee band as dollars.
 */
function parsePrice(value) {
  const match = /^(INR|USD):([\d.]+)-([\d.]+)$/.exec(value ?? '')
  return match ? { currency: match[1], min: Number(match[2]), max: Number(match[3]) } : null
}

export default function Marketplace() {
  const { currency, cycle, setCycle } = usePrefs()
  const [params, setParams] = useQuery()
  const q = params.q ?? ''
  const category = params.category ?? ''
  const sort = params.sort ?? 'popular'
  const freePlan = params.freePlan === 'true'
  const price = parsePrice(params.price)
  const band = price && price.currency === currency ? price : null

  const [searchText, setSearchText] = useState(q)
  const [categories, setCategories] = useState([])
  const [ranges, setRanges] = useState(null)
  const [tools, setTools] = useState([])
  const [pageInfo, setPageInfo] = useState({ page: 0, totalElements: 0, last: true })
  // The filters the shown results belong to; while they differ from the current filters, a new
  // search is in flight. Deriving "loading" this way needs no state reset inside the effect.
  const [loadedKey, setLoadedKey] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const moreController = useRef(null)

  // The search box follows the URL when Back/Forward changes it.
  const [lastQ, setLastQ] = useState(q)
  if (lastQ !== q) {
    setLastQ(q)
    setSearchText(q)
  }

  useEffect(() => {
    const controller = new AbortController()
    api.categories(controller.signal).then(setCategories).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api.priceRanges(currency, controller.signal).then(setRanges).catch(() => setRanges(null))
    return () => controller.abort()
  }, [currency])

  // Typing waits for a pause before it rewrites the URL.
  useEffect(() => {
    if (searchText === q) return undefined
    const timer = setTimeout(() => setParams({ q: searchText.trim() }), 350)
    return () => clearTimeout(timer)
  }, [searchText, q, setParams])

  const filters = {
    q,
    category,
    sort,
    freePlan,
    priceMin: band?.min,
    priceMax: band?.max,
    currency,
    // Only price sorts depend on the cycle; leaving it out otherwise avoids a needless reload.
    cycle: sort.startsWith('price') ? cycle : undefined,
  }
  const filterKey = JSON.stringify(filters)
  const loading = loadedKey !== filterKey

  useEffect(() => {
    moreController.current?.abort()
    const controller = new AbortController()
    api
      .tools({ ...JSON.parse(filterKey), page: 0, size: PAGE_SIZE }, controller.signal)
      .then((result) => {
        setTools(result.content)
        setPageInfo({ page: result.page, totalElements: result.totalElements, last: result.last })
        setError('')
        setLoadedKey(filterKey)
      })
      .catch((loadError) => {
        if (loadError.name === 'AbortError') return
        setTools([])
        setError(loadError.message)
        setLoadedKey(filterKey)
      })
    return () => controller.abort()
  }, [filterKey])

  const loadMore = () => {
    moreController.current?.abort()
    const controller = new AbortController()
    moreController.current = controller
    setLoadingMore(true)
    api
      .tools({ ...filters, page: pageInfo.page + 1, size: PAGE_SIZE }, controller.signal)
      .then((result) => {
        setTools((current) => [...current, ...result.content])
        setPageInfo({ page: result.page, totalElements: result.totalElements, last: result.last })
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
      .finally(() => {
        if (moreController.current === controller) setLoadingMore(false)
      })
  }

  const favorites = useFavoriteToggle((update) => setTools((items) => items.map(update)))

  const setPriceFilter = (value) => {
    if (value === 'free') setParams({ freePlan: 'true', price: '' })
    else if (value === '') setParams({ freePlan: '', price: '' })
    else setParams({ freePlan: '', price: value })
  }
  const priceValue = freePlan ? 'free' : band ? params.price : ''

  const activeCategory = categories.find((item) => item.slug === category)
  const hasFilters = q || category || freePlan || band
  const clearAll = () => {
    setSearchText('')
    setParams(() => ({ sort: sort === 'popular' ? '' : sort }))
  }

  const rangeLabel = (range) =>
    range.max >= (ranges?.highestMonthly ?? 0) && range === ranges.ranges[ranges.ranges.length - 1]
      ? `${formatMoney(range.min, currency)} and up`
      : `${formatMoney(range.min, currency)} – ${formatMoney(range.max, currency)}`

  return (
    <section className="page marketplace">
      <header className="page-head">
        <p className="eyebrow">Marketplace</p>
        <h1>{activeCategory ? activeCategory.name : 'All AI tools'}</h1>
        <p className="lede">
          {activeCategory?.description ??
            'Compare prices across monthly, quarterly and annual plans, then buy straight from the vendor.'}
        </p>
      </header>

      <div className="market-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <span className="sr-only">Search the marketplace</span>
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name, task or tag"
          />
        </label>

        <div className="cycle-switch" role="group" aria-label="Show prices per">
          {CYCLES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cycle === option.value ? 'is-active' : ''}
              aria-pressed={cycle === option.value}
              onClick={() => setCycle(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="sort-box">
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(event) => setParams({ sort: event.target.value })}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-secondary btn-sm filters-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Icon name="filter" size={18} /> Filters
        </button>
      </div>

      <div className="market-layout">
        <aside className={`market-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Filters">
          <fieldset>
            <legend>Price per month</legend>
            <label className="radio-row">
              <input
                type="radio"
                name="price"
                checked={priceValue === ''}
                onChange={() => setPriceFilter('')}
              />
              <span>Any price</span>
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="price"
                checked={priceValue === 'free'}
                onChange={() => setPriceFilter('free')}
              />
              <span>Free plan available</span>
              {ranges && <span className="count">{ranges.freePlanCount}</span>}
            </label>
            {ranges?.ranges.map((range) => {
              const value = `${currency}:${range.min}-${range.max}`
              return (
                <label key={value} className="radio-row">
                  <input
                    type="radio"
                    name="price"
                    checked={priceValue === value}
                    onChange={() => setPriceFilter(value)}
                  />
                  <span>{rangeLabel(range)}</span>
                  <span className="count">{range.count}</span>
                </label>
              )
            })}
            <p className="filter-note">Based on the entry paid plan, billed monthly.</p>
          </fieldset>

          <fieldset>
            <legend>Category</legend>
            <label className="radio-row">
              <input
                type="radio"
                name="category"
                checked={!category}
                onChange={() => setParams({ category: '' })}
              />
              <span>All categories</span>
            </label>
            {categories.map((item) => (
              <label key={item.slug} className="radio-row">
                <input
                  type="radio"
                  name="category"
                  checked={category === item.slug}
                  onChange={() => setParams({ category: item.slug })}
                />
                <CategoryIcon slug={item.slug} size={16} className="radio-icon" />
                <span>{item.name}</span>
                <span className="count">{item.toolCount}</span>
              </label>
            ))}
          </fieldset>
        </aside>

        <div className="market-results">
          <div className="results-bar">
            <p>
              {loading ? 'Searching…' : `${pageInfo.totalElements} ${pageInfo.totalElements === 1 ? 'tool' : 'tools'}`}
              {q && ` for "${q}"`}
            </p>
            {hasFilters && (
              <button type="button" className="text-link" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>

          <Message>{error || favorites.error}</Message>

          {loading ? (
            <Spinner label="Loading tools" />
          ) : tools.length === 0 ? (
            <div className="empty-state">
              <h3>No tools match these filters</h3>
              <p>Try a wider price band, another category, or ask the AI Chat.</p>
              <button type="button" className="btn btn-secondary" onClick={clearAll}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {tools.map((tool) => (
                  <ProductCard
                    key={tool.slug}
                    tool={tool}
                    busy={favorites.busySlug === tool.slug}
                    onToggleFavorite={favorites.toggle}
                  />
                ))}
              </div>
              {!pageInfo.last && (
                <div className="load-more">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Show more tools'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
