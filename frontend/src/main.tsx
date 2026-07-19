import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ds.css'
import App from './App.tsx'
import DemoApplication from './DemoApplication.tsx'

const isDemoApplication = new URLSearchParams(window.location.search).get('demo') === 'ats'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemoApplication ? <DemoApplication /> : <App />}
  </StrictMode>,
)
