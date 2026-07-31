import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import {
  Check,
  ChevronDown,
  History,
  MessageCircle,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, type ChatMessage, type Proposal } from '@/lib/api'
import {
  cancelTurn,
  deleteConversation,
  ensureLoaded,
  loadConversation,
  newConversation,
  onRendered,
  onTurnDone,
  sendMessage,
  setProposalCount,
  useChat,
} from '@/chat/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MODELS } from '@/lib/models'
import { cn } from '@/lib/utils'

const RAIL_MIN = 300
const RAIL_MAX = 720

export default function ChatRail({
  scope,
  title,
  subtitle,
  placeholder,
  onRenderedResult,
  onDone,
}: {
  scope: string
  title: string
  subtitle: string
  placeholder: string
  onRenderedResult?: (pages: number, ok: boolean) => void
  onDone?: () => void
}) {
  const chat = useChat(scope)
  const [draft, setDraft] = useState('')
  const [width, setWidth] = useState(() => Number(localStorage.getItem('chatRailWidth')) || 360)
  const [showHistory, setShowHistory] = useState(false)
  const [model, setModel] = useState(() => localStorage.getItem(`chatModel:${scope}`) ?? '')
  const [activityOpen, setActivityOpen] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ensureLoaded(scope)
  }, [scope])

  useEffect(() => {
    if (!onDone) return
    return onTurnDone(scope, onDone)
  }, [scope, onDone])

  useEffect(() => {
    if (!onRenderedResult) return
    return onRendered(scope, onRenderedResult)
  }, [scope, onRenderedResult])

  const refreshProposals = () =>
    api
      .proposals()
      .then((p) => {
        setProposals(p)
        setProposalCount(scope, p.filter((x) => !x.error).length)
      })
      .catch(() => {})

  useEffect(() => {
    refreshProposals()
    // proposal count changes arrive as turn events; refetch the full list then
  }, [scope, chat.proposals]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [chat.messages, chat.streaming, chat.tools, proposals])

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

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || chat.busy) return
    setUploading(true)
    try {
      for (const f of files) {
        const { path } = await api.upload(scope, f)
        setAttachments((a) => [...a, path])
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const send = () => {
    const files = attachments
    let text = draft.trim()
    if ((!text && files.length === 0) || chat.busy) return
    if (files.length > 0) {
      const note = `[Attached file${files.length === 1 ? '' : 's'}: ${files.join(', ')}]`
      text = text ? `${text}\n\n${note}` : note
    }
    setDraft('')
    setAttachments([])
    sendMessage(scope, text, model)
  }

  const retry = (interruptedIdx: number) => {
    // one-click retry: re-send the user message that preceded the interruption
    const prior = chat.messages.slice(0, interruptedIdx).findLast((m) => m.role === 'user')
    if (prior) sendMessage(scope, prior.text, model)
  }

  const resolveProposal = async (name: string, approve: boolean) => {
    try {
      await (approve ? api.approveProposal(name) : api.rejectProposal(name))
    } catch (e) {
      toast.error((e as Error).message)
    }
    refreshProposals()
    onDone?.()
  }

  const approveAll = async () => {
    try {
      const { skipped } = await api.approveAllProposals()
      if (skipped.length) toast.warning(`Skipped ${skipped.length} unreadable proposal(s).`)
    } catch (e) {
      toast.error((e as Error).message)
    }
    refreshProposals()
    onDone?.()
  }

  return (
    <div
      ref={railRef}
      style={{ width }}
      className="relative flex min-h-0 flex-none flex-col border-l bg-background"
    >
      <div
        onPointerDown={startResize}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 48 : 16
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          setWidth((w) => {
            const next = Math.min(RAIL_MAX, Math.max(RAIL_MIN, w + (e.key === 'ArrowLeft' ? step : -step)))
            localStorage.setItem('chatRailWidth', String(next))
            return next
          })
        }}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat panel"
        tabIndex={0}
        title="Drag to resize (or focus and use arrow keys)"
        className="absolute -left-1 top-0 bottom-0 z-10 w-2 cursor-col-resize focus:bg-primary/30 focus:outline-none"
      />

      {/* header */}
      <div className="flex flex-none items-center gap-2.5 border-b px-4 py-3">
        <span className="relative text-primary">
          <MessageCircle className="size-4" />
          {chat.busy && (
            <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-primary" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-[15px] font-semibold leading-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground">{chat.busy ? 'Working…' : subtitle}</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Conversation history"
          className={cn(showHistory && 'text-primary')}
          onClick={() => setShowHistory((s) => !s)}
        >
          <History className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="New conversation"
          disabled={chat.busy || chat.convId === null}
          onClick={() => {
            newConversation(scope)
            setShowHistory(false)
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* history popover */}
      {showHistory && (
        <div
          role="listbox"
          aria-label="Conversation history"
          className="absolute left-2 right-2 top-14 z-20 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-md"
        >
          {chat.conversations.length === 0 && (
            <div className="px-2.5 py-2 text-[13px] text-muted-foreground">No conversations yet.</div>
          )}
          {chat.conversations.map((c) => (
            <div
              key={c.id}
              role="option"
              tabIndex={0}
              aria-selected={c.id === chat.convId}
              onClick={() => {
                loadConversation(scope, c.id)
                setShowHistory(false)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                loadConversation(scope, c.id)
                setShowHistory(false)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent',
                c.id === chat.convId && 'bg-accent',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {c.active && <span className="size-1.5 flex-none animate-pulse rounded-full bg-primary" />}
                  <div className="truncate text-[13px]">{c.title}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(c.created * 1000).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {c.count} message{c.count === 1 ? '' : 's'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6 flex-none text-muted-foreground"
                title="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this conversation? Its checkpointed history stays in git.'))
                    deleteConversation(scope, c.id).catch((err) => toast.error((err as Error).message))
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {/* Keyed by conversation + position: Bubble holds local toolsOpen state,
            so switching conversations must remount rather than rebind expanded
            state to whatever message now sits at that index. */}
        {chat.messages.map((m, i) => (
          <Bubble
            key={`${chat.convId ?? 'new'}:${i}`}
            m={m}
            onRetry={m.interrupted ? () => retry(i) : undefined}
            busy={chat.busy}
          />
        ))}

        {!chat.busy && proposals.filter((p) => !p.error).length >= 2 && (
          <div className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {proposals.filter((p) => !p.error).length} proposals pending
            </span>
            <Button size="sm" className="ml-auto h-7 text-xs" onClick={approveAll}>
              <Check className="size-3" />
              Approve all
            </Button>
          </div>
        )}
        {!chat.busy &&
          proposals.map((p) => <InlineProposal key={p.name} p={p} onResolve={resolveProposal} />)}

        {chat.busy && (
          <div className="w-full max-w-[92%] flex-none self-start">
            <button
              className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              aria-expanded={activityOpen}
              onClick={() => setActivityOpen((o) => !o)}
            >
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              {chat.tools.length > 0
                ? `${chat.tools[chat.tools.length - 1]} · ${chat.tools.length} tool call${chat.tools.length === 1 ? '' : 's'}`
                : 'Thinking…'}
              <ChevronDown className={cn('size-3 transition-transform', !activityOpen && '-rotate-90')} />
            </button>
            {activityOpen && chat.tools.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {chat.tools.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            {activityOpen && chat.thinking && (
              <div
                className="mb-1.5 max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap"
                ref={(el) => el?.scrollTo({ top: el.scrollHeight })}
              >
                {chat.thinking}
              </div>
            )}
            {chat.streaming && (
              <div className="prose-chat text-[13px] leading-relaxed">
                <Markdown>{chat.streaming}</Markdown>
              </div>
            )}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="flex-none border-t px-3 pb-3 pt-2">
        <div className="mb-1 flex justify-end">
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              localStorage.setItem(`chatModel:${scope}`, e.target.value)
            }}
            title="Model for this chat"
            className="cursor-pointer border-none bg-transparent text-right text-[11px] text-muted-foreground outline-none"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m === '' ? 'default model' : m}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          {attachments.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {attachments.map((p) => (
                <Badge key={p} variant="secondary" className="gap-1 text-[11px]">
                  {p.split('/').pop()}
                  <button
                    title="Remove attachment"
                    onClick={() => setAttachments((a) => a.filter((x) => x !== p))}
                    className="inline-flex cursor-pointer"
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
              className="hidden"
              onChange={(e) => {
                uploadFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 flex-none text-muted-foreground"
              title="Attach file"
              disabled={uploading || chat.busy}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-3.5" />
            </Button>
            <textarea
              ref={taRef}
              rows={1}
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={(e) => {
                if (e.clipboardData.files.length > 0) {
                  e.preventDefault()
                  uploadFiles(Array.from(e.clipboardData.files))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              className="max-h-40 flex-1 resize-none overflow-y-auto border-none bg-transparent text-[13px] leading-normal outline-none placeholder:text-muted-foreground"
            />
            {chat.busy ? (
              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => cancelTurn(scope)}>
                Stop
              </Button>
            ) : (
              <Button
                size="icon-sm"
                className="size-7"
                title="Send message"
                aria-label="Send message"
                onClick={send}
                disabled={(!draft.trim() && attachments.length === 0) || uploading}
              >
                <Send className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InlineProposal({
  p,
  onResolve,
}: {
  p: Proposal
  onResolve: (name: string, approve: boolean) => void
}) {
  const d = p.data as { type?: string; title?: string; org?: string; bullets?: string[] }
  return (
    <div className="flex-none overflow-hidden rounded-lg border border-primary/30 bg-card">
      <div className="flex items-center gap-1.5 border-b border-primary/20 bg-accent px-3 py-1.5 font-heading text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
        {p.error ? <TriangleAlert className="size-3" /> : <Plus className="size-3" />}
        Proposed · {p.error ? 'unreadable' : (d.type ?? 'entry')}
      </div>
      <div className="p-3">
        {p.error ? (
          <>
            <div className="mb-1 text-[13px]">
              <b>{p.name}</b> could not be parsed:
            </div>
            <div className="whitespace-pre-wrap text-xs text-destructive">{p.error}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Ask the assistant to rewrite proposals/{p.name}.yaml as valid YAML, or discard it.
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 text-xs text-muted-foreground">
              Add to → <span className="text-foreground">{p.target ?? 'unknown target'}</span>
            </div>
            <div className="border-l-2 border-primary pl-2.5 text-[13px] leading-normal">
              <b>{d.title}</b>
              {d.org ? ` · ${d.org}` : ''}
              {(d.bullets ?? []).map((b, i) => (
                <div key={i}>- {b}</div>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex gap-2">
          {!p.error && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onResolve(p.name, true)}>
              <Check className="size-3" />
              Accept
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => onResolve(p.name, false)}
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ m, onRetry, busy }: { m: ChatMessage; onRetry?: () => void; busy: boolean }) {
  const [toolsOpen, setToolsOpen] = useState(false)
  if (m.role === 'user')
    return (
      <div className="max-w-[82%] flex-none self-end whitespace-pre-wrap rounded-xl rounded-br-sm border border-primary/20 bg-accent px-3 py-2 text-[13px] leading-normal">
        {m.text}
      </div>
    )
  if (m.role === 'error' || m.role === 'warning')
    return (
      <div className="flex max-w-[92%] flex-none items-start gap-1.5 self-start whitespace-pre-wrap border-l-2 border-destructive pl-2.5 text-xs text-destructive">
        <TriangleAlert className="mt-px size-3 flex-none" />
        {m.text}
      </div>
    )
  return (
    <div className="max-w-[92%] flex-none self-start">
      {m.tools && m.tools.length > 0 && (
        <>
          <button
            className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((o) => !o)}
          >
            {m.tools.length} tool call{m.tools.length === 1 ? '' : 's'}
            <ChevronDown className={cn('size-3 transition-transform', !toolsOpen && '-rotate-90')} />
          </button>
          {toolsOpen && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {m.tools.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
      <div className="prose-chat text-[13px] leading-relaxed">
        <Markdown>{m.text}</Markdown>
      </div>
      {m.interrupted && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <TriangleAlert className="size-3 text-destructive" />
          Turn interrupted (backend restarted); partial output above.
          {onRetry && (
            <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[11px]" disabled={busy} onClick={onRetry}>
              <RotateCcw className="size-2.5" />
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
