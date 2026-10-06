/**
 * Site-wide interaction effects, installed once from main.jsx.
 *
 * Everything is delegated from the document, so new cards and buttons pick the effects up with no
 * per-component wiring:
 *  - cards tilt toward the pointer and a soft spotlight follows it
 *  - buttons and chips get a ripple where they were pressed
 *  - cards, panels and section headings fade up the first time they scroll into view
 *  - the floating navbar condenses once the page scrolls
 * People who ask their system for reduced motion get none of the motion.
 */

const TILT_SELECTOR = '.product-card, .category-card, .kpi, .stat-tile, .feature-cell'
const RIPPLE_SELECTOR = '.btn, .chip, .icon-btn, .mic-btn, .send-btn, .dock-link, .fab'
const REVEAL_SELECTOR =
  '.product-card, .category-card, .section-head, .panel, .kpi, .stat-tile, .sub-row, .feature-cell, .promo-band, .chat-band, .empty-state'
const MAX_TILT_DEG = 6

let installed = false

export function installEffects() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

  installNavbarState()
  installSpotlightAndTilt(reducedMotion, finePointer)
  installRipple(reducedMotion)
  if (!reducedMotion.matches && 'IntersectionObserver' in window) installReveal()
}

function installNavbarState() {
  const root = document.documentElement
  let ticking = false
  const update = () => {
    root.classList.toggle('is-scrolled', window.scrollY > 24)
    ticking = false
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    },
    { passive: true },
  )
  update()
}

function installSpotlightAndTilt(reducedMotion, finePointer) {
  let active = null

  const reset = (card) => {
    card.style.removeProperty('--rx')
    card.style.removeProperty('--ry')
    card.classList.remove('is-tilting')
  }

  document.addEventListener(
    'pointermove',
    (event) => {
      if (!finePointer.matches) return
      const card = event.target.closest?.(TILT_SELECTOR)
      if (active && active !== card) {
        reset(active)
        active = null
      }
      if (!card) return
      active = card
      const rect = card.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
      if (!reducedMotion.matches) {
        card.style.setProperty('--rx', `${((0.5 - y) * MAX_TILT_DEG).toFixed(2)}deg`)
        card.style.setProperty('--ry', `${((x - 0.5) * MAX_TILT_DEG).toFixed(2)}deg`)
        card.classList.add('is-tilting')
      }
    },
    { passive: true },
  )

  document.addEventListener('pointerleave', () => active && reset(active), true)
}

function installRipple(reducedMotion) {
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (reducedMotion.matches || event.button !== 0) return
      const target = event.target.closest?.(RIPPLE_SELECTOR)
      if (!target || target.disabled) return
      const rect = target.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`
      target.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    },
    { passive: true },
  )
}

function installReveal() {
  document.documentElement.classList.add('fx-reveal')

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const element = entry.target
        // Siblings revealed together cascade instead of popping in at once.
        const siblings = element.parentElement
          ? [...element.parentElement.children].filter((child) => child.classList.contains('reveal'))
          : []
        const index = Math.max(0, siblings.indexOf(element))
        element.style.setProperty('--reveal-delay', `${Math.min(index, 8) * 55}ms`)
        element.classList.add('is-in')
        observer.unobserve(element)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )

  const watch = (root) => {
    const elements = root.matches?.(REVEAL_SELECTOR) ? [root] : []
    elements.push(...(root.querySelectorAll?.(REVEAL_SELECTOR) ?? []))
    for (const element of elements) {
      if (element.classList.contains('reveal')) continue
      element.classList.add('reveal')
      observer.observe(element)
    }
  }

  watch(document.body)
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) watch(node)
      }
    }
  }).observe(document.body, { childList: true, subtree: true })
}
