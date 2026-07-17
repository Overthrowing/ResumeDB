import { useState } from 'react'
import { api, type Health } from './api'
import { IconLogo } from './icons'

export default function Onboarding({ health, onDone }: { health: Health; onDone: () => void }) {
  const [path, setPath] = useState(health.data_repo)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)

  const browse = async () => {
    setPicking(true)
    setError('')
    try {
      const { path: picked } = await api.pickFolder()
      if (picked) setPath(picked)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPicking(false)
    }
  }

  const init = async () => {
    setBusy(true)
    setError('')
    try {
      await api.initDatarepo(path)
      onDone()
    } catch (e) {
      setError(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)' }}>
      <div className="dialog" style={{ width: 'min(480px, 92vw)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <IconLogo />
          <span className="dialog-title">Welcome to ResumeDB</span>
        </div>
        <div className="dialog-body">
          Your career data lives in its own private git repository - every entry, application, and agent
          edit is versioned there. Pick where it should live.
        </div>
        <div className="field">
          <label>Data repository path</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={path} onChange={(e) => setPath(e.target.value)} />
            <button className="btn btn-secondary" style={{ flex: 'none' }} disabled={picking} onClick={browse}>
              {picking ? 'Choosing…' : 'Browse…'}
            </button>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            Pick an empty or new folder - use New Folder in the dialog to create one.
          </div>
        </div>
        {!health.typst && (
          <div style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>
            typst is not installed - rendering will fail. Run: brew install typst
          </div>
        )}
        {!health.claude && (
          <div style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>
            The claude CLI was not found - agent features will be unavailable.
          </div>
        )}
        {error && <div style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>{error}</div>}
        <div className="dialog-actions">
          <button className="btn btn-primary" disabled={busy} onClick={init}>
            Create data repository
          </button>
        </div>
      </div>
    </div>
  )
}
