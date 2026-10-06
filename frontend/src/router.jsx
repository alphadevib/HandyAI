import { useCallback, useEffect, useState } from 'react'

/**
 * A small history router. The app has a handful of screens, so pulling in a routing library
 * would add a dependency without adding anything the pages need.
 */
export function navigate(path, { replace = false, state = {}, scroll = true } = {}) {
  // A newer release is live: switching pages is a natural moment to load it.
  if (window.__handyaiUpdateReady && !replace) {
    window.location.assign(path)
    return
  }
  if (replace) window.history.replaceState(state, '', path)
  else window.history.pushState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
}

function useLocationValue(read) {
  const [value, setValue] = useState(read)

  useEffect(() => {
    const onChange = () => setValue(read())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [read])

  return value
}

const readPath = () => window.location.pathname
const readSearch = () => window.location.search

export function useRoute() {
  return useLocationValue(readPath)
}

/**
 * The query string as a plain object, plus a setter that rewrites it in place. Filters live in
 * the URL, so a filtered marketplace can be bookmarked, shared and restored with Back.
 */
export function useQuery() {
  const search = useLocationValue(readSearch)
  const params = Object.fromEntries(new URLSearchParams(search))

  const setParams = useCallback((next, { replace = true } = {}) => {
    const current = Object.fromEntries(new URLSearchParams(window.location.search))
    const merged = typeof next === 'function' ? next(current) : { ...current, ...next }
    const clean = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== null && value !== '') clean.set(key, value)
    }
    const text = clean.toString()
    navigate(`${window.location.pathname}${text ? `?${text}` : ''}`, { replace, scroll: false })
  }, [])

  return [params, setParams]
}

/** Matches "/tools/:slug" against a path; returns the params, or null when it does not match. */
export function matchPath(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params = {}
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

/** Anchor that keeps middle-click and ctrl-click working like a normal link. */
export function Link({ to, state, children, className, onClick, ...rest }) {
  const handleClick = useCallback(
    (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
      event.preventDefault()
      onClick?.(event)
      navigate(to, { state })
    },
    [to, state, onClick],
  )

  return (
    <a href={to} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}

/** Sends a signed-out visitor to sign in, then back to where they were. */
export function goToSignIn(notice) {
  navigate('/login', {
    state: {
      notice,
      returnTo: `${window.location.pathname}${window.location.search}`,
    },
  })
}
