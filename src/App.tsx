import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Play } from './pages/Play'
import { Room } from './pages/Room'

export default function App() {
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games/:gameId" element={<Play />} />
          <Route path="/rooms/:roomId" element={<Room />} />
        </Routes>
      </main>
      <footer className="app-footer">noriter</footer>
    </div>
  )
}
