import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Launcher from './pages/Launcher'
import DemoPlaceholder from './pages/DemoPlaceholder'
import WorkforceCallAgent from './pages/WorkforceCallAgent'
import ForecastDetail from './pages/ForecastDetail'
import ProductionPlanning from './pages/ProductionPlanning'

export default function App() {
  useEffect(() => {
    document.title = 'Sixth Generation — Demo Launcher'
  }, [])

  return (
    <Routes>
      <Route index element={<Launcher />} />
      <Route path="demo/workforce-call-agent" element={<WorkforceCallAgent />} />
      <Route path="demo/demand-forecasting" element={<ForecastDetail />} />
      <Route path="demo/smart-production-planning" element={<ProductionPlanning />} />
      <Route path="demo/:slug" element={<DemoPlaceholder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
