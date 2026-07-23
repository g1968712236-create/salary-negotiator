import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'

// PostHog 埋点初始化（E-001；未配置 VITE_POSTHOG_KEY 时静默 no-op，见 ANALYTICS.md §11）
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
