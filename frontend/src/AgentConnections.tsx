import { useEffect, useMemo, useState } from 'react'
import { api, type McpConnection } from './api'

function formatCreated(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function AgentConnections() {
  const [connection, setConnection] = useState<McpConnection | null>(null)
  const [token, setToken] = useState('')
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    api.mcpConnection().then(setConnection).catch((e) => setError(e.message))
  }, [])

  const genericConfig = useMemo(() => {
    if (!connection || !token) return ''
    return `URL: ${connection.mcp_url}\nAuthorization: Bearer ${token}`
  }, [connection, token])

  const copy = async (label: string, value: string) => {
    setError('')
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      setError('Copy failed. Select the setup text and copy it manually.')
    }
  }

  const rotate = async () => {
    if (connection?.enabled) {
      const confirmed = window.confirm('Create a new token? The current connected-agent token will stop working immediately.')
      if (!confirmed) return
    }
    setBusy(true)
    setError('')
    try {
      const next = await api.rotateMcpConnection()
      setConnection(next)
      setToken(next.token ?? '')
      setCommand(next.codex_command ?? '')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async () => {
    const confirmed = window.confirm('Disconnect every agent using this token? You can create a new connection later.')
    if (!confirmed) return
    setBusy(true)
    setError('')
    try {
      const next = await api.revokeMcpConnection()
      setConnection(next)
      setToken('')
      setCommand('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card agent-connect-card">
      <div className="agent-connect-header">
        <div>
          <div className="card-kicker">Bring your own agent</div>
          <h3>Use your agent, not our API key</h3>
          <p className="card-body">
            Connect Codex or another MCP client. Your agent does the reasoning with its own account while ResumeDB supplies the complete approved knowledge base and safely stores its drafts.
          </p>
        </div>
        <div className={`agent-connect-status ${connection?.enabled ? 'is-connected' : ''}`}>
          <span />
          {connection?.enabled ? 'Token active' : 'Not connected'}
        </div>
      </div>

      {!connection && !error && <div className="agent-connect-loading">Checking connection...</div>}

      {connection && (
        <>
          <div className="agent-connect-summary">
            <div>
              <strong>{connection.tools.length}</strong>
              <span>bounded career tools</span>
            </div>
            <div>
              <strong>0</strong>
              <span>model keys required</span>
            </div>
            <div>
              <strong>2</strong>
              <span>human checkpoints</span>
            </div>
          </div>

          {!connection.enabled && (
            <div className="agent-connect-empty">
              <div>
                <strong>Create a revocable connection</strong>
                <p>The token is shown once. ResumeDB stores only its hash.</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={rotate} disabled={busy}>
                {busy ? 'Creating...' : 'Create agent connection'}
              </button>
            </div>
          )}

          {connection.enabled && !token && (
            <div className="agent-connect-empty">
              <div>
                <strong>Connection token {connection.token_hint}</strong>
                <p>Created {formatCreated(connection.created_at)}. Rotate it to reveal a new token and setup command.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={rotate} disabled={busy}>
                {busy ? 'Rotating...' : 'Rotate and show setup'}
              </button>
            </div>
          )}

          {connection.enabled && token && (
            <div className="agent-connect-setup">
              <div className="agent-connect-notice">
                Save this setup now. The plaintext token disappears when this page reloads.
              </div>

              <div className="agent-connect-step">
                <div className="agent-connect-step-number">1</div>
                <div>
                  <strong>Connect Codex</strong>
                  <p>Run both lines in one terminal, then launch or restart Codex from that terminal.</p>
                </div>
                <button className="btn btn-ghost" type="button" onClick={() => copy('codex', command)}>
                  {copied === 'codex' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <pre className="agent-connect-code"><code>{command}</code></pre>

              <div className="agent-connect-step">
                <div className="agent-connect-step-number">2</div>
                <div>
                  <strong>Or use any Streamable HTTP MCP client</strong>
                  <p>Add the endpoint and send the token as a bearer authorization header.</p>
                </div>
                <button className="btn btn-ghost" type="button" onClick={() => copy('generic', genericConfig)}>
                  {copied === 'generic' ? 'Copied' : 'Copy details'}
                </button>
              </div>
              <pre className="agent-connect-code"><code>{genericConfig}</code></pre>

              <div className="agent-connect-prompt">
                <div>
                  <strong>Try this after connecting</strong>
                  <p>Use ResumeDB to read my complete career context, find internships I qualify for, and save supported applications as drafts.</p>
                </div>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => copy('prompt', 'Use ResumeDB to read my complete career context, find internships I qualify for, and save supported applications as drafts.')}
                >
                  {copied === 'prompt' ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
            </div>
          )}

          {connection.enabled && (
            <div className="agent-connect-footer">
              <span>Connected agents can read everything you approved. They cannot mark a draft Ready or submit an application.</span>
              <button className="btn btn-ghost agent-connect-revoke" type="button" onClick={revoke} disabled={busy}>
                Revoke token
              </button>
            </div>
          )}
        </>
      )}

      {error && <div className="agent-connect-error" role="alert">{error}</div>}
    </section>
  )
}
