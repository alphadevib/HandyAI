import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from './api/client'
import { useAuth } from './context/AuthContext'
import { goToSignIn, useRoute } from './router'
import { visitorId } from './visitor'

const HEARTBEAT_MS = 30_000

/**
 * Tells the server this tab is open, so the admin dashboard can count live users. Beats on every
 * page change and every 30 seconds while the tab is visible; a hidden tab goes quiet and drops off
 * the count after about a minute.
 */
export function usePresence() {
  const path = useRoute()
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === 'visible') api.presence(visitorId(), window.location.pathname)
    }
    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [path, userId])
}

/**
 * Saving a tool to the user's list from any page. A guest is sent to sign in and brought back;
 * on success the caller's list is updated through {@code apply}.
 */
export function useFavoriteToggle(apply) {
  const { isAuthenticated } = useAuth()
  const [busySlug, setBusySlug] = useState(null)
  const [error, setError] = useState('')

  const toggle = useCallback(
    async (tool) => {
      if (!isAuthenticated) {
        goToSignIn(`Sign in or create a free account to save ${tool.name} to your list.`)
        return
      }
      setBusySlug(tool.slug)
      setError('')
      try {
        const result = await api.toggleFavorite(tool.slug)
        apply((item) => (item.slug === tool.slug ? { ...item, favorite: result.favorite } : item))
      } catch (toggleError) {
        setError(
          toggleError instanceof ApiError && toggleError.status === 401
            ? 'Your session expired. Please sign in again.'
            : toggleError.message,
        )
      } finally {
        setBusySlug(null)
      }
    },
    [isAuthenticated, apply],
  )

  return { toggle, busySlug, error }
}
