import { Link, useRoute } from '../router'
import { Icon } from './Icons'

const DOCK = [
  { to: '/categories', label: 'Categories', icon: 'grid' },
  { to: '/marketplace', label: 'Market', icon: 'store' },
  { to: '/chat', label: 'AI Chat', icon: 'chat' },
]

/**
 * The floating controls that sit above every page: a dock with the three main sections on phones,
 * and an "Ask AI" pill everywhere except the chat itself.
 */
export default function FloatingBars() {
  const path = useRoute()
  const onChat = path.startsWith('/chat')

  return (
    <>
      {!onChat && (
        <Link to="/chat" className="fab" aria-label="Ask HandyAI">
          <span className="fab-ring" aria-hidden="true" />
          <Icon name="mic" size={20} />
          <span className="fab-label">Ask AI</span>
        </Link>
      )}

      <nav className="dock" aria-label="Main sections">
        {DOCK.map((item) => {
          const active = path.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`dock-link ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
