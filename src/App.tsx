import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import CameraQuizPage from './pages/CameraQuizPage'
import AdminPage from './pages/admin/AdminPage'
import AdminMapPage from './pages/admin/AdminMapPage'
import MigratePage from './pages/MigratePage'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz/:mapId" element={<QuizPage />} />
        <Route path="/camera/:mapId" element={<CameraQuizPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/map/:mapId" element={<AdminMapPage />} />
        <Route path="/admin/map/new" element={<AdminMapPage />} />
        <Route path="/migrate" element={<MigratePage />} />
      </Route>
    </Routes>
  )
}
