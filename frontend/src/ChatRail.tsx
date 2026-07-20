import { useCallback, useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { api, type Proposal } from './api'
import { IconChat, IconCheck, IconHistory, IconPlus, IconSend, IconWarn, IconX } from './icons'
import { apiUrl, websocketUrl } from './runtime'

const RAIL_MIN = 300
const RAIL_MAX = 720
const CLAUDE_MODELS = ['', 'haiku', 'sonnet', 'opus', 'fable']
const CODEX_MODELS = ['', 'gpt-5.3-codex-spark', 'gpt-5.6-sol']

export interface Conversation {
  id: string
  title: string
  created: number
  count: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error' | 'warning'
  text: string
  tools?: string[]
}

interface ChatEvent {
  type: string
  [k: string]: unknown
}

export default function ChatRail({
  scope,
  title,
  subtitle,
  placeholder,
  context,
  onRendered,
  onTurnDone,
}: {
  scope: string
  title: string
  subtitle: string
  placeholder: string
  context?: string
  onRendered?: (pages: number, ok: boolean) => void
  onTurnDone?: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [thinking, setThinking] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [width, setWidth] = useState(() => Number(localStorage.getItem('chatRailWidth')) || 344)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [convs, setConvs] = useState<Conversation[]>([])
  const [convId, setConvId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [model, setModel] = useState(() => localStorage.getItem(`chatModel:${scope}`) ?? '')
  const [provider, setProvider] = useState<'claude' | 'codex' | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const convRef = useRef<string | null>(null)
  convRef.current = convId
  const scrollRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef({ text: '', thinking: '', tools: [] as string[] })

  const startResize = (down: React.PointerEvent) => {
    down.preventDefault()
    const right = railRef.current?.getBoundingClientRect().right ?? window.innerWidth
    const max = Math.min(RAIL_MAX, window.innerWidth * 0.5)
    const onMove = (e: PointerEvent) => {
      const w = Math.min(max, Math.max(RAIL_MIN, right - e.clientX))
      setWidth(w)
      localStorage.setItem('chatRailWidth', String(w))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const loadConversation = useCallback(
    (id: string | null) => {
      wsRef.current?.close()
      setConvId(id)
      setShowHistory(false)
      if (!id) {
        setMessages([])
        return
      }
      fetch(apiUrl(`/api/chat/${encodeURIComponent(scope)}/conversations/${id}`))
        .then((r) => (r.ok ? r.json() : []))
        .then(setMessages)
        .catch(() => setMessages([]))
    },
    [scope],
  )

  const refreshConvs = useCallback(
    () =>
      fetch(apiUrl(`/api/chat/${encodeURIComponent(scope)}/conversations`))
        .then((r) => (r.ok ? r.json() : []))
        .then((c: Conversation[]) => {
          setConvs(c)
          return c
        }),
    [scope],
  )

  const deleteConv = async (id: string) => {
    if (!confirm('Delete this conversation? Its checkpointed history stays in git.')) return
    try {
      const res = await fetch(apiUrl(`/api/chat/${encodeURIComponent(scope)}/conversations/${id}`), { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
      const remaining = await refreshConvs()
      if (id === convRef.current) loadConversation(remaining[0]?.id ?? null)
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: (e as Error).message }])
    }
  }

  useEffect(() => {
    refreshConvs()
      .then((c) => loadConversation(c[0]?.id ?? null))
      .catch(() => {})
    api
      .proposals()
      .then(setProposals)
      .catch((e) => setMessages((m) => [...m, { role: 'error', text: `Could not load pending approvals: ${e.message}` }]))
    api
      .config()
      .then((configured) => {
        const nextProvider = configured.agent_provider
        const available = nextProvider === 'codex' ? CODEX_MODELS : CLAUDE_MODELS
        setProvider(nextProvider)
        setModel((current) => {
          if (available.includes(current)) return current
          localStorage.removeItem(`chatModel:${scope}`)
          return ''
        })
      })
      .catch(() => setProvider(null))
    return () => wsRef.current?.close()
  }, [scope, refreshConvs, loadConversation])

  const resolveProposal = async (name: string, approve: boolean) => {
    try {
      await (approve ? api.approveProposal(name) : api.rejectProposal(name))
      setProposals((p) => p.filter((x) => x.name !== name))
      onTurnDone?.()
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: (e as Error).message }])
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming, tools, proposals])

  const handleEvent = useCallback(
    (ev: ChatEvent) => {
      switch (ev.type) {
        case 'text_delta':
          streamRef.current.text += ev.text as string
          setStreaming(streamRef.current.text)
          break
        case 'thinking_delta':
          streamRef.current.thinking += ev.text as string
          setThinking(streamRef.current.thinking)
          break
        case 'tool_use':
          streamRef.current.tools = [...streamRef.current.tools, ev.name as string]
          setTools(streamRef.current.tools)
          break
        case 'result': {
          const text = (ev.text as string) || streamRef.current.text
          setMessages((m) => [...m, { role: 'assistant', text, tools: streamRef.current.tools }])
          streamRef.current = { text: '', thinking: '', tools: [] }
          setStreaming('')
          setThinking('')
          setTools([])
          break
        }
        case 'error':
          setMessages((m) => [...m, { role: 'error', text: ev.message as string }])
          streamRef.current = { text: '', thinking: '', tools: [] }
          setStreaming('')
          setThinking('')
          setTools([])
          setBusy(false)
          break
        case 'warning':
          setMessages((m) => [...m, { role: 'warning', text: ev.message as string }])
          break
        case 'rendered':
          onRendered?.(ev.pages as number, ev.ok as boolean)
          break
        case 'proposals':
          api
            .proposals()
            .then(setProposals)
            .catch((e) =>
              setMessages((m) => [...m, { role: 'error', text: `Could not load pending approvals: ${(e as Error).message}` }]),
            )
          break
        case 'conversation':
          setConvId(ev.id as string)
          break
        case 'turn_done':
          setBusy(false)
          refreshConvs().catch(() => {})
          onTurnDone?.()
          break
      }
    },
    [onRendered, onTurnDone, refreshConvs],
  )

  const connect = (): Promise<WebSocket> =>
    new Promise((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve(wsRef.current)
        return
      }
      const query = new URLSearchParams({
        scope,
        conversation: convRef.current ?? '',
      })
      const ws = new WebSocket(websocketUrl(`/api/chat?${query}`))
      ws.onopen = () => resolve(ws)
      ws.onerror = () => reject(new Error('chat connection failed'))
      ws.onmessage = (e) => handleEvent(JSON.parse(e.data))
      ws.onclose = () => {
        wsRef.current = null
      }
      wsRef.current = ws
    })

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setMessages((m) => [...m, { role: 'user', text }])
    setBusy(true)
    try {
      const ws = await connect()
      ws.send(JSON.stringify({ type: 'message', text, model: model || undefined }))
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: (e as Error).message }])
      setBusy(false)
    }
  }

  const cancel = () => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
  }

  return (
    <div ref={railRef} style={{ width, flex: 'none', borderLeft: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      <div
        onPointerDown={startResize}
        title="Drag to resize"
        style={{ position: 'absolute', left: -3, top: 0, bottom: 0, width: 7, cursor: 'col-resize', zIndex: 10 }}
      />
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--color-accent)' }}>
          <IconChat size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{title}</div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            {subtitle}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: 28, height: 28, color: showHistory ? 'var(--color-accent)' : 'var(--color-neutral-600)' }}
          title="Conversation history"
          onClick={() => setShowHistory((s) => !s)}
        >
          <IconHistory size={15} />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: 28, height: 28, color: 'var(--color-neutral-600)' }}
          title="New conversation"
          disabled={busy || convId === null}
          onClick={() => loadConversation(null)}
        >
          <IconPlus size={15} />
        </button>
      </div>

      {showHistory && (
        <div className="rs-scroll" style={{ position: 'absolute', top: 58, left: 8, right: 8, maxHeight: 300, zIndex: 20, background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: 6 }}>
          {convs.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13, padding: '8px 10px' }}>
              No conversations yet.
            </div>
          )}
          {convs.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: c.id === convId ? 'var(--color-accent-100)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: c.id === convId ? 'var(--color-accent-800)' : 'var(--color-text)' }}>
                  {c.title}
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {new Date(c.created * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {' · '}
                  {c.count} message{c.count === 1 ? '' : 's'}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                style={{ width: 24, height: 24, flex: 'none', color: 'var(--color-neutral-500)' }}
                title="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteConv(c.id)
                }}
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="rs-scroll" style={{ flex: 1, padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minHeight: 0 }}>
        {context && <div style={{ fontSize: 11, color: 'var(--color-neutral-500)', textAlign: 'center', flex: 'none' }}>{context}</div>}
        {messages.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {!busy &&
          proposals.map((p) => (
            <InlineProposal key={p.name} p={p} onResolve={resolveProposal} />
          ))}
        {busy && (
          <div style={{ flex: 'none', alignSelf: 'flex-start', maxWidth: '90%', width: '100%' }}>
            {tools.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {tools.map((t, i) => (
                  <span key={i} className="tag tag-neutral" style={{ fontSize: 10 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {thinking && (
              <div className="thinking-stream rs-scroll" ref={(el) => el?.scrollTo({ top: el.scrollHeight })}>
                {thinking}
              </div>
            )}
            <div className="chat-md" style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>
              {streaming ? <Markdown>{streaming}</Markdown> : !thinking && <span className="text-muted">Thinking…</span>}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 'var(--space-2) var(--space-3) var(--space-3)', borderTop: '1px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              localStorage.setItem(`chatModel:${scope}`, e.target.value)
            }}
            title="Model for this chat"
            style={{ border: 'none', background: 'transparent', color: 'var(--color-neutral-600)', fontSize: 11, fontFamily: 'var(--font-body)', cursor: 'pointer', textAlign: 'right' }}
          >
            {(provider === 'codex' ? CODEX_MODELS : provider === 'claude' ? CLAUDE_MODELS : ['']).map((m) => (
              <option key={m} value={m}>
                {m === '' ? 'default model' : m}
              </option>
            ))}
          </select>
        </div>
        <div style={{ border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 11px', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            rows={1}
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-body)', border: 'none', outline: 'none', background: 'transparent', resize: 'none', color: 'var(--color-text)' }}
          />
          {busy ? (
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={cancel}>
              Stop
            </button>
          ) : (
            <button className="btn btn-icon btn-primary" style={{ width: 30, height: 30 }} onClick={send} disabled={!draft.trim()}>
              <IconSend size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InlineProposal({ p, onResolve }: { p: Proposal; onResolve: (name: string, approve: boolean) => void }) {
  const d = p.data as { type?: string; title?: string; org?: string; bullets?: string[] }
  if (p.error)
    return (
      <div style={{ flex: 'none', border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-md)', background: 'var(--color-neutral-100)', overflow: 'hidden' }}>
        <div style={{ padding: '7px 12px', background: 'var(--color-accent-100)', borderBottom: '1px solid var(--color-accent-200)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--color-accent-800)', letterSpacing: '.04em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
          <IconWarn size={13} />
          Proposed · unreadable
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <b>{p.name}</b> could not be parsed:
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-accent-700)', whiteSpace: 'pre-wrap' }}>{p.error}</div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Ask the assistant to rewrite proposals/{p.name}.yaml as valid YAML, or discard it.
          </div>
          <div style={{ display: 'flex', marginTop: 12 }}>
            <button className="btn btn-ghost" style={{ padding: '6px 8px', fontSize: 13, marginLeft: 'auto' }} onClick={() => onResolve(p.name, false)}>
              Discard
            </button>
          </div>
        </div>
      </div>
    )
  return (
    <div style={{ flex: 'none', border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-md)', background: 'var(--color-neutral-100)', overflow: 'hidden' }}>
      <div style={{ padding: '7px 12px', background: 'var(--color-accent-100)', borderBottom: '1px solid var(--color-accent-200)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--color-accent-800)', letterSpacing: '.04em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
        <IconPlus size={13} />
        Proposed · {d.type ?? 'entry'}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginBottom: 4 }}>
          Add to → <span style={{ color: 'var(--color-text)' }}>{p.target ?? 'unknown target'}</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, borderLeft: '2px solid var(--color-accent)', paddingLeft: 10 }}>
          <b>{d.title}</b>
          {d.org ? ` · ${d.org}` : ''}
          {(d.bullets ?? []).map((b, i) => (
            <div key={i}>- {b}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => onResolve(p.name, true)}>
            <IconCheck size={13} />
            Accept
          </button>
          <button className="btn btn-ghost" style={{ padding: '6px 8px', fontSize: 13, marginLeft: 'auto' }} onClick={() => onResolve(p.name, false)}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.role === 'user')
    return (
      <div style={{ flex: 'none', alignSelf: 'flex-end', maxWidth: '82%', background: 'var(--color-accent-100)', border: '1px solid var(--color-accent-200)', borderRadius: '10px 10px 2px 10px', padding: '10px 12px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {m.text}
      </div>
    )
  if (m.role === 'error' || m.role === 'warning')
    return (
      <div style={{ flex: 'none', alignSelf: 'flex-start', maxWidth: '90%', fontSize: 12, color: 'var(--color-accent-700)', borderLeft: '2px solid var(--color-accent)', paddingLeft: 9, display: 'flex', gap: 6, alignItems: 'flex-start', whiteSpace: 'pre-wrap' }}>
        <span style={{ flex: 'none', marginTop: 1 }}>
          <IconWarn size={13} />
        </span>
        {m.text}
      </div>
    )
  return (
    <div style={{ flex: 'none', alignSelf: 'flex-start', maxWidth: '90%' }}>
      {m.tools && m.tools.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {m.tools.map((t, i) => (
            <span key={i} className="tag tag-neutral" style={{ fontSize: 10 }}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="chat-md" style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>
        <Markdown>{m.text}</Markdown>
      </div>
    </div>
  )
}
