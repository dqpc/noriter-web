import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Play } from './pages/Play'

export default function App() {
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/:gameId" element={<Play />} />
        </Routes>
      </main>
      <footer className="app-footer">noriter</footer>
    </div>
  )
}
