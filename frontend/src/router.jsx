import { useCallback, useEffect, useState } from 'react'

/**
 * A 40-line history router. The app has a handful of screens, so pulling in a routing library
 * would add a dependency without adding anything the pages need.
 */
export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', path)
  else window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
}

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])

  return path
}

/** Anchor that keeps middle-click and ctrl-click working like a normal link. */
export function Link({ to, children, className, onClick, ...rest }) {
  const handleClick = useCallback(
    (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
      event.preventDefault()
      onClick?.(event)
      navigate(to)
    },
    [to, onClick],
  )

  return (
    <a href={to} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
