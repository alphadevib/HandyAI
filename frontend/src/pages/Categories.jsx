import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { CategoryIcon } from '../components/Icons'
import Message from '../components/Message'
import Spinner from '../components/Spinner'
import ToolLogo from '../components/ToolLogo'
import { Link } from '../router'

/** Every category with a peek at the tools inside it. Open to guests. */
export default function Categories() {
  const [categories, setCategories] = useState(null)
  const [toolsByCategory, setToolsByCategory] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.categories(controller.signal),
      api.tools({ size: 60, sort: 'popular' }, controller.signal),
    ])
      .then(([categoryResult, toolResult]) => {
        const grouped = {}
        for (const tool of toolResult.content) {
          ;(grouped[tool.categorySlug] ??= []).push(tool)
        }
        setCategories(categoryResult)
        setToolsByCategory(grouped)
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">Categories</p>
        <h1>Browse AI tools by the job they do</h1>
        <p className="lede">Pick a category to open it in the marketplace with prices and plans.</p>
      </header>

      <Message>{error}</Message>

      {categories === null && !error ? (
        <Spinner label="Loading categories" />
      ) : (
        <div className="category-grid">
          {categories?.map((category) => {
            const tools = toolsByCategory[category.slug] ?? []
            return (
              <Link
                key={category.slug}
                to={`/marketplace?category=${category.slug}`}
                className="category-card"
              >
                <span className={`category-badge lg cat-${category.slug}`}>
                  <CategoryIcon slug={category.slug} size={26} />
                </span>
                <span className="category-name">{category.name}</span>
                <span className="category-description">{category.description}</span>
                <span className="category-foot">
                  <span className="logo-stack" aria-hidden="true">
                    {tools.slice(0, 4).map((tool) => (
                      <ToolLogo key={tool.slug} tool={tool} size={28} />
                    ))}
                  </span>
                  <span className="category-count">{category.toolCount} tools</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
