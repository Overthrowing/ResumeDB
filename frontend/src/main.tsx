import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'
import Library from './routes/Library'
import Applications from './routes/Applications'
import Workspace from './routes/Workspace'
import Templates from './routes/Templates'
import Settings from './routes/Settings'
import Onboarding from './routes/Onboarding'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<App />}>
            <Route index element={<Navigate to="/library" replace />} />
            <Route path="library" element={<Library />} />
            <Route path="applications" element={<Applications />} />
            <Route path="applications/:id" element={<Workspace />} />
            <Route path="templates" element={<Templates />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  </StrictMode>,
)
