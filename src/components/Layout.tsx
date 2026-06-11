import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between px-4 py-3" style={{ background: '#16213e', borderBottom: '1px solid #2a2a4a' }}>
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold" style={{ color: '#e8a020', letterSpacing: '0.05em' }}>R6</span>
          <span className="text-xl font-bold text-white">GUSSR</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm no-underline" style={{ color: isAdmin ? '#8888aa' : '#e8a020' }}>
            Jouer
          </Link>
          <Link to="/admin" className="text-sm no-underline" style={{ color: isAdmin ? '#e8a020' : '#8888aa' }}>
            Admin
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
