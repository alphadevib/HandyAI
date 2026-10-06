import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * How the visitor wants prices shown: rupees or dollars, and per month, quarter or year. Stored
 * in the browser so the choice survives a reload; every price on the site reads it from here.
 */
const PrefsContext = createContext(null)
const STORAGE_KEY = 'handyai.prefs'

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      currency: stored.currency === 'USD' ? 'USD' : 'INR',
      cycle: ['MONTHLY', 'QUARTERLY', 'ANNUAL'].includes(stored.cycle) ? stored.cycle : 'MONTHLY',
    }
  } catch {
    return { currency: 'INR', cycle: 'MONTHLY' }
  }
}

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(readStored)

  const update = useCallback((patch) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* the choice just lasts for this visit */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      ...prefs,
      setCurrency: (currency) => update({ currency }),
      setCycle: (cycle) => update({ cycle }),
    }),
    [prefs, update],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const context = useContext(PrefsContext)
  if (!context) throw new Error('usePrefs must be used inside <PrefsProvider>')
  return context
}
