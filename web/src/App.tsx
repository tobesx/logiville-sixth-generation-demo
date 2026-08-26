import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Launcher from './pages/Launcher'
import DemoPlaceholder from './pages/DemoPlaceholder'
import WorkforceCallAgent from './pages/WorkforceCallAgent'
import ForecastDetail from './pages/ForecastDetail'
import People from './pages/People'
import LoginGate from './pages/ui/LoginGate'

export default function App() {
  useEffect(() => {
    document.title = 'Sixth Generation — Demo Launcher'
  }, [])

  return (
    <LoginGate>
      <Routes>
        <Route index element={<Launcher />} />
        <Route path="people" element={<People />} />
        <Route path="demo/workforce-call-agent" element={<WorkforceCallAgent />} />
        <Route path="demo/demand-forecasting" element={<ForecastDetail />} />
        <Route path="demo/:slug" element={<DemoPlaceholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LoginGate>
  )
}
