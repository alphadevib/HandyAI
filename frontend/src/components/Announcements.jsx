import { useEffect, useState } from 'react'
import { BrandMark } from './Brand'
import { Icon } from './Icons'
import { openSuggestions } from './SuggestionDialog'
import { RELEASES, WHATS_NEW_WINDOW_MS } from '../releases'
import { Link } from '../router'

/* global __APP_BUILD__ */
const BUILD = __APP_BUILD__
const WELCOMED_KEY = 'handyai.welcomed'
const SEEN_RELEASE_KEY = 'handyai.seenRelease'
const UPDATE_CHECK_MS = 2 * 60 * 1000

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* the note just shows again next visit */
  }
}

/**
 * What a visitor is told when they arrive:
 *  - first visit ever: a welcome note
 *  - a release deployed in the last 48 hours they have not seen: "What's new"
 *  - a newer release deployed while this tab is open: a bar that refreshes the page
 */
export default function Announcements() {
  const [note, setNote] = useState(() => {
    const latest = RELEASES[0]
    if (!read(WELCOMED_KEY)) return 'welcome'
    const fresh =
      latest &&
      latest.version === BUILD.version &&
      Date.now() - new Date(BUILD.builtAt).getTime() < WHATS_NEW_WINDOW_MS
    if (fresh && read(SEEN_RELEASE_KEY) !== latest.version) return 'whats-new'
    return null
  })

  const close = () => {
    write(WELCOMED_KEY, '1')
    // Someone welcomed today does not need "What's new" for the release they just met.
    if (RELEASES[0]) write(SEEN_RELEASE_KEY, RELEASES[0].version)
    setNote(null)
  }

  return (
    <>
      {note === 'welcome' && <WelcomeNote onClose={close} />}
      {note === 'whats-new' && <WhatsNew release={RELEASES[0]} onClose={close} />}
      <UpdateBar />
    </>
  )
}

function WelcomeNote({ onClose }) {
  return (
    <aside className="toast-card welcome" role="dialog" aria-labelledby="welcome-title">
      <button type="button" className="icon-btn sheet-close" onClick={onClose}>
        <Icon name="close" size={16} />
        <span className="sr-only">Close</span>
      </button>
      <BrandMark size={44} />
      <h2 id="welcome-title">Welcome to HandyAI</h2>
      <p>
        We have just opened our doors. Compare AI tools by price, ask the AI Chat what fits your
        work, and keep every subscription in one place. You are one of our very first visitors,
        so your ideas shape what we build next.
      </p>
      <div className="form-actions">
        <Link to="/marketplace" className="btn btn-primary btn-sm" onClick={onClose}>
          Explore the marketplace
        </Link>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            onClose()
            openSuggestions()
          }}
        >
          Share an idea
        </button>
      </div>
    </aside>
  )
}

function WhatsNew({ release, onClose }) {
  return (
    <aside className="toast-card whats-new" role="dialog" aria-labelledby="whats-new-title">
      <button type="button" className="icon-btn sheet-close" onClick={onClose}>
        <Icon name="close" size={16} />
        <span className="sr-only">Close</span>
      </button>
      <p className="eyebrow">
        <Icon name="spark" size={14} /> What&apos;s new · v{release.version}
      </p>
      <h2 id="whats-new-title">{release.title}</h2>
      <ul className="whats-new-list">
        {release.highlights.map((item) => (
          <li key={item}>
            <Icon name="check" size={16} />
            {item}
          </li>
        ))}
      </ul>
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
          Got it
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onClose()
            openSuggestions()
          }}
        >
          Suggest a feature
        </button>
      </div>
    </aside>
  )
}

/**
 * Watches /version.json and, when a newer build is live, offers a refresh. The page refreshes by
 * itself after a short countdown unless the visitor is typing, so nobody loses a half-written
 * message. Only production builds publish version.json, so the dev server never shows it.
 */
function UpdateBar() {
  const [available, setAvailable] = useState(false)
  const [seconds, setSeconds] = useState(15)

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined
    let cancelled = false
    const check = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) return
        const live = await response.json()
        if (!cancelled && live.id && live.id !== BUILD.id) {
          window.__handyaiUpdateReady = true
          setAvailable(true)
        }
      } catch {
        /* offline or mid-deploy: try again next time */
      }
    }
    check()
    const timer = setInterval(check, UPDATE_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  useEffect(() => {
    if (!available) return undefined
    const tick = setInterval(() => {
      const typing = document.activeElement?.matches?.('input, textarea, select, [contenteditable]')
      if (typing) return
      setSeconds((value) => {
        if (value <= 1) {
          window.location.reload()
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [available])

  if (!available) return null
  return (
    <div className="update-bar" role="status">
      <Icon name="spark" size={18} />
      <span>
        <strong>HandyAI just got better.</strong> Refreshing in {seconds}s…
      </span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
        Refresh now
      </button>
    </div>
  )
}
