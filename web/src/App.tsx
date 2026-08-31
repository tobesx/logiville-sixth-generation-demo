import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Launcher from './pages/Launcher'
import DemoPlaceholder from './pages/DemoPlaceholder'
import WorkforceCallAgent from './pages/WorkforceCallAgent'

export default function App() {
  useEffect(() => {
    document.title = 'Sixth Generation — Demo Launcher'
  }, [])

  return (
    <Routes>
      <Route index element={<Launcher />} />
      <Route path="demo/workforce-call-agent" element={<WorkforceCallAgent />} />
      {/* Demand Forecasting en Smart Production Planning vallen hier weer in.
          Hun code staat in web/archive/ — zie de README daar. */}
      <Route path="demo/:slug" element={<DemoPlaceholder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
