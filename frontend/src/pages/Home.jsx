import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { Icon, CategoryIcon } from '../components/Icons'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import ToolLogo from '../components/ToolLogo'
import { useAuth } from '../context/AuthContext'
import { useFavoriteToggle } from '../hooks'
import { Link, navigate } from '../router'

/** The storefront: search, personalised picks, categories and what is popular right now. */
export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const [stats, setStats] = useState(null)
  const [categories, setCategories] = useState([])
  const [trending, setTrending] = useState([])
  const [freeTools, setFreeTools] = useState([])
  const [forYou, setForYou] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.stats(controller.signal),
      api.categories(controller.signal),
      api.trending(8, controller.signal),
      api.tools({ freePlan: true, size: 4, sort: 'rating' }, controller.signal),
    ])
      .then(([statsResult, categoryResult, trendingResult, freeResult]) => {
        setStats(statsResult)
        setCategories(categoryResult)
        setTrending(trendingResult)
        setFreeTools(freeResult.content)
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [isAuthenticated])

  const profession = user?.profession
  useEffect(() => {
    if (!profession) return undefined
    const controller = new AbortController()
    api
      .recommend({ profession, limit: 8 }, controller.signal)
      .then((result) => setForYou(result.recommendations))
      .catch(() => setForYou([]))
    return () => controller.abort()
  }, [profession])

  const applyEverywhere = useCallback((update) => {
    setTrending((items) => items.map(update))
    setFreeTools((items) => items.map(update))
    setForYou((items) => items?.map((entry) => ({ ...entry, tool: update(entry.tool) })))
  }, [])
  const favorites = useFavoriteToggle(applyEverywhere)

  const submitSearch = (event) => {
    event.preventDefault()
    navigate(`/marketplace${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`)
  }

  const showcase = trending.slice(0, 8)

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Icon name="spark" size={16} /> The AI tools marketplace
          </p>
          <h1>
            Every AI tool your work needs, <span className="accent">matched to what you do.</span>
          </h1>
          <p className="lede">
            Compare {stats?.toolCount ?? 'dozens of'} AI platforms by price, see monthly, quarterly
            and annual plans side by side, and keep every subscription in one place.
          </p>

          <form className="hero-search" onSubmit={submitSearch} role="search">
            <Icon name="search" size={20} />
            <label htmlFor="hero-search" className="sr-only">
              Search the marketplace
            </label>
            <input
              id="hero-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools: video editing, logo, meeting notes…"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>

          <div className="hero-actions">
            <Link to="/chat" className="btn btn-secondary">
              <Icon name="mic" size={18} /> Ask HandyAI by voice or chat
            </Link>
            <Link to="/marketplace?freePlan=true" className="btn btn-ghost">
              Browse free tools
            </Link>
          </div>

          {stats && (
            <dl className="hero-stats">
              <div>
                <dt>AI tools</dt>
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

        <div className="hero-wall" aria-hidden="true">
          {showcase.map((tool, index) => (
            <span key={tool.slug} className="wall-tile" style={{ '--i': index }}>
              <ToolLogo tool={tool} size={44} />
              <span>{tool.name}</span>
            </span>
          ))}
        </div>
      </section>

      <Message>{error || favorites.error}</Message>

      {isAuthenticated && profession ? (
        <section className="section">
          <header className="section-head row">
            <div>
              <p className="eyebrow">Picked for you</p>
              <h2>Top tools for a {profession.toLowerCase()}</h2>
            </div>
            <Link to="/profile" className="text-link">
              Change profession
            </Link>
          </header>
          {forYou === null ? (
            <Spinner label="Finding your matches" />
          ) : (
            <div className="product-grid">
              {forYou.map((entry) => (
                <ProductCard
                  key={entry.tool.slug}
                  tool={entry.tool}
                  reasons={entry.reasons}
                  busy={favorites.busySlug === entry.tool.slug}
                  onToggleFavorite={favorites.toggle}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="promo-band">
          <div>
            <h2>Get picks made for your profession</h2>
            <p>
              Tell us what you do, from software developer to chartered accountant, and the
              marketplace puts the tools that fit your work first.
            </p>
          </div>
          <div className="promo-actions">
            <Link to="/signup" className="btn btn-primary">
              Create a free profile
            </Link>
            <Link to="/chat" className="btn btn-ghost">
              Or just ask the chat
            </Link>
          </div>
        </section>
      )}

      <section className="section">
        <header className="section-head row">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>What do you need help with?</h2>
          </div>
          <Link to="/categories" className="text-link">
            All categories
          </Link>
        </header>
        <div className="category-strip">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/marketplace?category=${category.slug}`}
              className="category-chip"
            >
              <span className={`category-badge cat-${category.slug}`}>
                <CategoryIcon slug={category.slug} size={20} />
              </span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <header className="section-head row">
          <div>
            <p className="eyebrow">Trending</p>
            <h2>Most popular in the marketplace</h2>
          </div>
          <Link to="/marketplace" className="text-link">
            See all tools
          </Link>
        </header>
        {loading ? (
          <Spinner label="Loading the marketplace" />
        ) : (
          <div className="product-grid">
            {trending.map((tool) => (
              <ProductCard
                key={tool.slug}
                tool={tool}
                busy={favorites.busySlug === tool.slug}
                onToggleFavorite={favorites.toggle}
              />
            ))}
          </div>
        )}
      </section>

      {freeTools.length > 0 && (
        <section className="section">
          <header className="section-head row">
            <div>
              <p className="eyebrow">Free to start</p>
              <h2>Best rated with a free plan</h2>
            </div>
            <Link to="/marketplace?freePlan=true" className="text-link">
              All free tools
            </Link>
          </header>
          <div className="product-grid">
            {freeTools.map((tool) => (
              <ProductCard
                key={tool.slug}
                tool={tool}
                busy={favorites.busySlug === tool.slug}
                onToggleFavorite={favorites.toggle}
              />
            ))}
          </div>
        </section>
      )}

      <section className="chat-band">
        <span className="chat-band-icon">
          <Icon name="mic" size={28} />
        </span>
        <div>
          <h2>Not sure what to search for?</h2>
          <p>Tell HandyAI what you are trying to do, out loud or in a sentence, and it picks the tools.</p>
        </div>
        <Link to="/chat" className="btn btn-primary">
          Open AI Chat
        </Link>
      </section>
    </>
  )
}
