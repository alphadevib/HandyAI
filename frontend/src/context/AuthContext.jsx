import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  // A stored token may have expired while the tab was closed, so it is verified once on load
  // rather than trusted.
  useEffect(() => {
    if (!getToken()) {
      return undefined
    }
    let cancelled = false
    api
      .me()
      .then((profile) => {
        if (!cancelled) setUser(profile)
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(async (payload) => {
    const result = await api.register(payload)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const updated = await api.updateProfile(payload)
    setUser(updated)
    return updated
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      updateProfile,
      logout,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
    }),
    [user, loading, login, register, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
