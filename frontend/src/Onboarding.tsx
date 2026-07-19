import { useState } from 'react'
import { api, type Health, type ParsedResume } from './api'
import { IconLogo } from './icons'

export default function Onboarding({ health, onDone }: { health: Health; onDone: () => void }) {
  const [step, setStep] = useState<'repo' | 'import'>('repo')
  const [path, setPath] = useState(health.data_repo)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)

  // PDF Importer State
  const [dragActive, setDragActive] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)
  const [importing, setImporting] = useState(false)

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
      // Instead of completing onboarding, proceed to PDF import step
      setStep('import')
    } catch (e) {
      setError(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type !== "application/pdf") {
        setError("Only PDF files are supported.")
        return
      }
      await uploadPDF(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      await uploadPDF(file)
    }
  }

  const uploadPDF = async (file: File) => {
    setImporting(true)
    setError('')
    try {
      const res = await api.importResume(file)
      setParsedData(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!parsedData) return
    setBusy(true)
    setError('')
    try {
      await api.confirmImport(parsedData)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'import') {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)' }}>
        <div className="dialog" style={{ width: 'min(500px, 92vw)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <IconLogo />
            <span className="dialog-title">Import Existing Resume</span>
          </div>
          <div className="dialog-body" style={{ marginBottom: 'var(--space-4)' }}>
            Jumpstart your profile by parsing an existing PDF resume using AI. You can skip this step to start fresh.
          </div>

          {importing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 12, border: '2px dashed var(--color-divider)', borderRadius: 'var(--radius-md)' }}>
              <div className="loader" style={{ border: '4px solid var(--color-neutral-300)', borderTop: '4px solid var(--color-accent)', borderRadius: '50%', width: 28, height: 28, animation: 'spin 1s linear infinite' }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Parsing PDF text & building profile details...</div>
            </div>
          ) : parsedData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-divider)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-neutral-100)', maxHeight: 240, overflowY: 'auto' }}>
              <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: 6 }}>
                <strong style={{ fontSize: 14 }}>{parsedData.profile.name || 'Candidate Name'}</strong>
                <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>
                  {parsedData.profile.email} {parsedData.profile.phone ? `· ${parsedData.profile.phone}` : ''}
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Extracted Entries:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {parsedData.entries.map((ent, idx) => (
                    <span key={idx} className="tag tag-accent" style={{ fontSize: 10 }}>
                      {ent.type}: {ent.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 160,
                border: dragActive ? '2px dashed var(--color-accent)' : '2px dashed var(--color-divider)',
                borderRadius: 'var(--radius-md)',
                background: dragActive ? 'color-mix(in srgb, var(--color-accent) 4%, transparent)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '0 var(--space-4)',
                position: 'relative'
              }}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Drag and drop your PDF resume here</span>
              <span style={{ fontSize: 11, color: 'var(--color-neutral-500)', marginTop: 4 }}>or click to browse from files</span>
            </div>
          )}

          {error && <div style={{ fontSize: 13, color: 'var(--color-accent-700)', marginTop: 'var(--space-3)' }}>{error}</div>}

          <div className="dialog-actions" style={{ marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary" onClick={onDone} disabled={busy}>
              Skip & Continue
            </button>
            {parsedData && (
              <button className="btn btn-primary" onClick={handleConfirmImport} disabled={busy}>
                Import Profile
              </button>
            )}
          </div>
        </div>
      </div>
    )
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
