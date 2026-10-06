import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import { useRoute } from './router'
import './App.css'

function Routes() {
  const path = useRoute()

  switch (path) {
    case '/':
    case '':
      return <Home />
    case '/login':
      return <Login mode="login" />
    case '/signup':
      return <Login mode="signup" />
    default:
      return <NotFound />
  }
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Navbar />
        <main id="main">
          <Routes />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}
