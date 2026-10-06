import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { BrandMark } from '../components/Brand'
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
          <h1 className="hero-title">
            <span className="strong">Every AI Tool</span> <span className="thin">your</span>{' '}
            <span className="thin">work needs,</span> <span className="strong">Matched</span>{' '}
            <span className="thin">to</span> <span className="strong accent">You</span>
            <span className="hero-seal" aria-hidden="true">
              <Icon name="check" size={18} />
            </span>
          </h1>

          <div className="hero-cta">
            <Link to="/marketplace" className="btn btn-dark btn-lg">
              Explore now <Icon name="external" size={18} />
            </Link>
            <p>
              Compare {stats?.toolCount ?? 'dozens of'} AI platforms by price, with monthly,
              quarterly and annual plans side by side.
            </p>
          </div>

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
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-ring" />
          <span className="orbit-ring orbit-ring-2" />
          <span className="orbit-core">
            <BrandMark size={84} />
          </span>
          {showcase.map((tool, index) => (
            <span key={tool.slug} className="orbit-tile" style={{ '--i': index, '--n': showcase.length }}>
              <ToolLogo tool={tool} size={42} />
              <span className="orbit-name">{tool.name}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="feature-strip" aria-label="Highlights">
        <Link to={isAuthenticated ? '/profile' : '/signup'} className="feature-cell">
          <span>
            <strong>Start your personalised path</strong> to the right AI stack
          </span>
          <span className="feature-link">
            {isAuthenticated ? 'Set your profession' : 'Create a profile'} <Icon name="external" size={14} />
          </span>
        </Link>
        <Link to="/chat" className="feature-cell">
          <span className="feature-icon">
            <Icon name="mic" size={22} />
          </span>
          <span>
            <strong>Just say it.</strong> Ask our AI Chat by voice and get tools picked for the job.
          </span>
        </Link>
        <Link to="/marketplace" className="feature-cell feature-dark">
          <span className="logo-stack">
            {showcase.slice(0, 3).map((tool) => (
              <ToolLogo key={tool.slug} tool={tool} size={36} />
            ))}
          </span>
          <span>
            <strong className="feature-big">+{stats?.toolCount ?? 39}</strong>
            <span className="feature-small">
              AI tools compared · {stats?.userCount ?? 0} members
            </span>
          </span>
        </Link>
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
