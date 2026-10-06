import { useState } from 'react'
import { Icon } from './Icons'

const STORAGE_KEY = 'handyai.theme'
const THEME_COLOURS = { dark: '#050a10', light: '#f3f8fb' }

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/**
 * Sun in the dark theme (switch to light), moon in the light theme (switch back to dark). The
 * choice is remembered, and index.html applies it before the first paint on the next visit.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  const toggle = () => {
    const root = document.documentElement
    // Colours fade across for the switch only, so normal hovers keep their own timing.
    root.classList.add('theme-switching')
    if (next === 'light') root.dataset.theme = 'light'
    else delete root.dataset.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOURS[next])
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* the choice lasts for this visit */
    }
    setTheme(next)
    window.setTimeout(() => root.classList.remove('theme-switching'), 450)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={next === 'light' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={next === 'light' ? 'Light theme' : 'Dark theme'}
    >
      <span key={theme} className="theme-icon">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
      </span>
    </button>
  )
}
