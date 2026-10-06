import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, api } from '../api/client'
import Message from '../components/Message'
import Spinner from '../components/Spinner'
import ToolCard from '../components/ToolCard'
import { useAuth } from '../context/AuthContext'
import { navigate } from '../router'

const PRICING_FILTERS = [
  { value: 'ALL', label: 'Any price' },
  { value: 'FREE', label: 'Free' },
  { value: 'FREEMIUM', label: 'Free tier' },
  { value: 'TRIAL', label: 'Free trial' },
  { value: 'PAID', label: 'Paid' },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most used' },
  { value: 'rating', label: 'Best rated' },
  { value: 'name', label: 'A to Z' },
  { value: 'newest', label: 'Newest' },
]

const PAGE_SIZE = 9

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  const [stats, setStats] = useState(null)
  const [categories, setCategories] = useState([])

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [pricing, setPricing] = useState('ALL')
  const [sort, setSort] = useState('popular')

  const [tools, setTools] = useState([])
  const [pageInfo, setPageInfo] = useState({ page: 0, totalElements: 0, last: true })
  const [loadingTools, setLoadingTools] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [toolsError, setToolsError] = useState('')

  const [goal, setGoal] = useState('')
  const [profession, setProfession] = useState('')
  const [matchPricing, setMatchPricing] = useState('ALL')
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [matchResult, setMatchResult] = useState(null)

  const [favoriteBusy, setFavoriteBusy] = useState(null)
  const [notice, setNotice] = useState('')

  const discoverRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api.stats(controller.signal), api.categories(controller.signal)])
      .then(([statsResult, categoryResult]) => {
        setStats(statsResult)
        setCategories(categoryResult)
      })
      .catch(() => {
        /* the page still works without the counters */
      })
    return () => controller.abort()
  }, [])

  // Prefill the role box from the signed-in profile, without fighting the user once they type.
  const [seededProfession, setSeededProfession] = useState(null)
  if (user?.profession && seededProfession !== user.profession) {
    setSeededProfession(user.profession)
    if (!profession) setProfession(user.profession)
  }

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoadingTools(true)
      setToolsError('')
      api
        .tools(
          { q: query, category: activeCategory, pricing, sort, page: 0, size: PAGE_SIZE },
          controller.signal,
        )
        .then((result) => {
          setTools(result.content)
          setPageInfo({
            page: result.page,
            totalElements: result.totalElements,
            last: result.last,
          })
        })
        .catch((error) => {
          if (error.name === 'AbortError') return
          setToolsError(error.message)
        })
        .finally(() => setLoadingTools(false))
    }, query ? 300 : 0)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, activeCategory, pricing, sort, isAuthenticated])

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    api
      .tools({
        q: query,
        category: activeCategory,
        pricing,
        sort,
        page: pageInfo.page + 1,
        size: PAGE_SIZE,
      })
      .then((result) => {
        setTools((current) => [...current, ...result.content])
        setPageInfo({ page: result.page, totalElements: result.totalElements, last: result.last })
      })
      .catch((error) => setToolsError(error.message))
      .finally(() => setLoadingMore(false))
  }, [query, activeCategory, pricing, sort, pageInfo.page])

  const submitMatch = useCallback(
    async (event) => {
      event.preventDefault()
      setMatching(true)
      setMatchError('')
      try {
        const result = await api.recommend({
          goal,
          profession,
          pricing: matchPricing,
          categorySlugs: activeCategory ? [activeCategory] : [],
          limit: 6,
        })
        setMatchResult(result)
      } catch (error) {
        setMatchError(error.message)
      } finally {
        setMatching(false)
      }
    },
    [goal, profession, matchPricing, activeCategory],
  )

  const toggleFavorite = useCallback(
    async (tool) => {
      if (!isAuthenticated) {
        setNotice('Create a free account to keep a list of the tools you like.')
        navigate('/login')
        return
      }
      setFavoriteBusy(tool.slug)
      try {
        const result = await api.toggleFavorite(tool.slug)
        const apply = (item) =>
          item.slug === tool.slug ? { ...item, favorite: result.favorite } : item
        setTools((current) => current.map(apply))
        setMatchResult((current) =>
          current
            ? {
                ...current,
                recommendations: current.recommendations.map((entry) => ({
                  ...entry,
                  tool: apply(entry.tool),
                })),
              }
            : current,
        )
      } catch (error) {
        setNotice(
          error instanceof ApiError && error.status === 401
            ? 'Your session expired. Please sign in again.'
            : error.message,
        )
      } finally {
        setFavoriteBusy(null)
      }
    },
    [isAuthenticated],
  )

  const resultCount = useMemo(() => pageInfo.totalElements ?? 0, [pageInfo.totalElements])

  const focusDiscover = (slug) => {
    setActiveCategory((current) => (current === slug ? '' : slug))
    discoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI tool discovery</p>
          <h1>
            The right AI tool for the job,
            <span className="accent"> without the endless list</span>
          </h1>
          <p className="lede">
            Most people use two or three AI tools and never hear about the one that would have
            saved them an afternoon. Describe what you are trying to do and HandyAI suggests
            platforms that fit, with the reason it picked each one.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary btn-lg" href="#match">
              Find my tools
            </a>
            <a className="btn btn-secondary btn-lg" href="#discover">
              Browse the catalogue
            </a>
          </div>
          {stats && (
            <dl className="hero-stats">
              <div>
                <dt>Tools</dt>
                <dd>{stats.toolCount}</dd>
              </div>
              <div>
                <dt>Categories</dt>
                <dd>{stats.categoryCount}</dd>
              </div>
              <div>
                <dt>Members</dt>
                <dd>{stats.userCount}</dd>
              </div>
            </dl>
          )}
        </div>

        <aside className="hero-panel" aria-label="Example suggestions">
          <p className="panel-title">People are looking for</p>
          <ul className="panel-list">
            {[
              'summarise my meetings automatically',
              'make product photos without a studio',
              'review my code before my teammate does',
              'read 40 research papers this week',
            ].map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setGoal(example)
                    document.getElementById('match')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <Message tone="info">{notice}</Message>

      <section id="match" className="section matcher">
        <header className="section-head">
          <h2>Tell us the job, not the tool</h2>
          <p>
            One or two sentences is enough. Signing in lets HandyAI learn from what you save and
            rate.
          </p>
        </header>

        <form className="match-form" onSubmit={submitMatch}>
          <label className="field">
            <span>What are you trying to get done?</span>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={3}
              maxLength={400}
              placeholder="e.g. turn long client calls into a summary and a follow-up email"
              required
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Your role (optional)</span>
              <input
                type="text"
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                maxLength={120}
                placeholder="Marketer, student, developer…"
              />
            </label>
            <label className="field">
              <span>Budget</span>
              <select
                value={matchPricing}
                onChange={(event) => setMatchPricing(event.target.value)}
              >
                {PRICING_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={matching}>
            {matching ? 'Matching…' : 'Show my matches'}
          </button>
        </form>

        <Message>{matchError}</Message>

        {matchResult && (
          <div className="match-results">
            <p className="match-summary">{matchResult.summary}</p>
            <div className="tool-grid">
              {matchResult.recommendations.map((entry) => (
                <ToolCard
                  key={entry.tool.id}
                  tool={entry.tool}
                  reasons={entry.reasons}
                  matchScore={entry.matchScore}
                  busy={favoriteBusy === entry.tool.slug}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="categories" className="section">
        <header className="section-head">
          <h2>Browse by what you do</h2>
          <p>Thirteen corners of the AI landscape, each with tools worth knowing about.</p>
        </header>

        <div className="category-grid">
          {categories.map((category) => (
            <button
              type="button"
              key={category.slug}
              className={`category-card ${activeCategory === category.slug ? 'is-active' : ''}`}
              onClick={() => focusDiscover(category.slug)}
            >
              <span className="category-icon" aria-hidden="true">
                {category.icon}
              </span>
              <span className="category-name">{category.name}</span>
              <span className="category-count">{category.toolCount} tools</span>
              <span className="category-description">{category.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="discover" className="section" ref={discoverRef}>
        <header className="section-head">
          <h2>The catalogue</h2>
          <p>
            {resultCount} {resultCount === 1 ? 'tool' : 'tools'} match your filters.
          </p>
        </header>

        <div className="filters">
          <label className="field search-field">
            <span className="sr-only">Search tools</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, task or tag…"
            />
          </label>

          <label className="field">
            <span className="sr-only">Category</span>
            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="sr-only">Pricing</span>
            <select value={pricing} onChange={(event) => setPricing(event.target.value)}>
              {PRICING_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="sr-only">Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Message>{toolsError}</Message>

        {loadingTools ? (
          <Spinner label="Loading tools" />
        ) : tools.length === 0 ? (
          <p className="empty">
            Nothing matches that yet. Try a broader word, or clear the filters.
          </p>
        ) : (
          <>
            <div className="tool-grid">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  busy={favoriteBusy === tool.slug}
                  onToggleFavorite={toggleFavorite}
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
      </section>
    </>
  )
}
