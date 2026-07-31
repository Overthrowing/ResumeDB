import { useEffect, useRef, useState } from 'react'
import { Check, History, MessageCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Proposal } from '@/lib/api'
import {
  ensureLoaded,
  newConversation,
  onRendered,
  onTurnDone,
  sendMessage,
  setProposalCount,
  useChat,
} from '@/chat/store'
import Composer from '@/components/chat/Composer'
import ConversationHistory from '@/components/chat/ConversationHistory'
import InlineProposal from '@/components/chat/InlineProposal'
import LiveActivity from '@/components/chat/LiveActivity'
import MessageBubble from '@/components/chat/MessageBubble'
import { useRailWidth } from '@/components/chat/useRailWidth'
import { Button } from '@/components/ui/button'
import { resolveModel, type ModelKind } from '@/lib/models'
import { cn } from '@/lib/utils'

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
  const [showHistory, setShowHistory] = useState(false)
  // An application chat is a tailoring chat; everything else is a plain chat.
  const modelKind: ModelKind = scope.startsWith('app:') ? 'tailor' : 'chat'
  // Anything stored before this scope had a default - including the old '' that
  // meant "let the CLI decide" - resolves to the kind's default.
  const [model, setModel] = useState(() => resolveModel(localStorage.getItem(`chatModel:${scope}`), modelKind))
  const [activityOpen, setActivityOpen] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const railRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { width, onPointerDown, onKeyDown } = useRailWidth(railRef)

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [chat.messages, chat.streaming, chat.tools, proposals])

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

  const pending = proposals.filter((p) => !p.error).length

  return (
    <div
      ref={railRef}
      style={{ width }}
      className="relative flex min-h-0 flex-none flex-col border-l bg-background"
    >
      <div
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
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

      {showHistory && (
        <ConversationHistory
          scope={scope}
          convId={chat.convId}
          conversations={chat.conversations}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* messages */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {/* Keyed by conversation + position: MessageBubble holds local toolsOpen
            state, so switching conversations must remount rather than rebind
            expanded state to whatever message now sits at that index. */}
        {chat.messages.map((m, i) => (
          <MessageBubble
            key={`${chat.convId ?? 'new'}:${i}`}
            m={m}
            onRetry={m.interrupted ? () => retry(i) : undefined}
            busy={chat.busy}
          />
        ))}

        {!chat.busy && pending >= 2 && (
          <div className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">{pending} proposals pending</span>
            <Button size="sm" className="ml-auto h-7 text-xs" onClick={approveAll}>
              <Check className="size-3" />
              Approve all
            </Button>
          </div>
        )}
        {!chat.busy &&
          proposals.map((p) => <InlineProposal key={p.name} p={p} onResolve={resolveProposal} />)}

        {chat.busy && (
          <LiveActivity
            tools={chat.tools}
            thinking={chat.thinking}
            streaming={chat.streaming}
            open={activityOpen}
            onToggle={() => setActivityOpen((o) => !o)}
          />
        )}
      </div>

      <Composer
        scope={scope}
        placeholder={placeholder}
        busy={chat.busy}
        model={model}
        modelKind={modelKind}
        onModelChange={(m) => {
          setModel(m)
          localStorage.setItem(`chatModel:${scope}`, m)
        }}
      />
    </div>
  )
}
