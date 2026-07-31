import { X } from 'lucide-react'
import { toast } from 'sonner'
import { type Conversation } from '@/lib/api'
import { deleteConversation, loadConversation } from '@/chat/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Popover listing this scope's conversations, with switch and delete. */
export default function ConversationHistory({
  scope,
  convId,
  conversations,
  onClose,
}: {
  scope: string
  convId: string | null
  conversations: Conversation[]
  onClose: () => void
}) {
  const open = (id: string) => {
    loadConversation(scope, id)
    onClose()
  }

  return (
    <div
      role="listbox"
      aria-label="Conversation history"
      className="absolute left-2 right-2 top-14 z-20 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-md"
    >
      {conversations.length === 0 && (
        <div className="px-2.5 py-2 text-[13px] text-muted-foreground">No conversations yet.</div>
      )}
      {conversations.map((c) => (
        <div
          key={c.id}
          role="option"
          tabIndex={0}
          aria-selected={c.id === convId}
          onClick={() => open(c.id)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            open(c.id)
          }}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent',
            c.id === convId && 'bg-accent',
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
  )
}
