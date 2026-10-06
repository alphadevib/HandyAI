import Announcements from './components/Announcements'
import FloatingBars from './components/FloatingBars'
import SuggestionDialog from './components/SuggestionDialog'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import Spinner from './components/Spinner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PrefsProvider } from './context/PrefsContext'
import Admin from './pages/Admin'
import Categories from './pages/Categories'
import Chat from './pages/Chat'
import Home from './pages/Home'
import Login from './pages/Login'
import Marketplace from './pages/Marketplace'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Subscriptions from './pages/Subscriptions'
import ToolDetail from './pages/ToolDetail'
import { usePresence } from './hooks'
import { matchPath, navigate, useRoute } from './router'
import { useEffect } from 'react'
import './App.css'

/** Pages that need an account send guests to sign in, then straight back. */
function RequireUser({ children, admin = false, notice }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const path = useRoute()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true, state: { notice, returnTo: path } })
    }
  }, [loading, isAuthenticated, notice, path])

  if (loading || !isAuthenticated) return <Spinner label="Checking your account" />
  if (admin && !isAdmin) return <NotFound />
  return children
}

function Routes() {
  const path = useRoute()

  const tool = matchPath('/tools/:slug', path)
  if (tool) return <ToolDetail key={tool.slug} slug={tool.slug} />

  switch (path) {
    case '/':
    case '':
      return <Home />
    case '/categories':
      return <Categories />
    case '/marketplace':
      return <Marketplace />
    case '/chat':
      return <Chat />
    case '/login':
      return <Login mode="login" />
    case '/signup':
      return <Login mode="signup" />
    case '/profile':
      return (
        <RequireUser notice="Sign in to see your profile.">
          <Profile />
        </RequireUser>
      )
    case '/subscriptions':
      return (
        <RequireUser notice="Sign in to see and manage your subscriptions.">
          <Subscriptions />
        </RequireUser>
      )
    case '/admin':
      return (
        <RequireUser admin notice="Sign in with an admin account.">
          <Admin />
        </RequireUser>
      )
    default:
      return <NotFound />
  }
}

/** Re-keyed on every route so each page fades in instead of snapping into place. */
function PageTransition({ children }) {
  const path = useRoute()
  return (
    <main id="main" key={path} className="page-enter">
      {children}
    </main>
  )
}

/** Lives inside AuthProvider so a heartbeat carries the signed-in user's token. */
function Presence() {
  usePresence()
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <PrefsProvider>
        <Presence />
        <div className="app-shell">
          <Navbar />
          <PageTransition>
            <Routes />
          </PageTransition>
          <Footer />
          <FloatingBars />
          <Announcements />
          <SuggestionDialog />
        </div>
      </PrefsProvider>
    </AuthProvider>
  )
}
