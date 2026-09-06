import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { GameEntry } from './pages/GameEntry'
import { Play } from './pages/Play'
import { VisitCounter } from './components/VisitCounter'
import { Room } from './pages/Room'
import { AuthProvider } from './auth/AuthContext'
import { RequireIdentity } from './auth/RequireIdentity'
import { SocialDock } from './social/SocialDock'

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/games/:gameId"
              element={
                <RequireIdentity>
                  <GameEntry />
                </RequireIdentity>
              }
            />
            <Route
              path="/games/:gameId/play"
              element={
                <RequireIdentity>
                  <Play />
                </RequireIdentity>
              }
            />
            <Route path="/rooms/:roomId" element={<Room />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>noriter</span>
          <VisitCounter />
        </footer>
        <SocialDock />
      </div>
    </AuthProvider>
  )
}
