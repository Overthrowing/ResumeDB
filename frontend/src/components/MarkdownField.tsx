import { useState } from 'react'
import Markdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// Notion-style live field: rendered markdown at rest, raw editor on click,
// re-rendered on blur. With readOnly it is a plain rendered view (used for
// agent-authored output, where an editor that ignores keystrokes reads as
// broken).
export default function MarkdownField({
  value,
  onChange,
  placeholder = 'Write markdown…',
  minHeight = 90,
  className,
  readOnly = false,
  label,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
  readOnly?: boolean
  label?: string
}) {
  const [editing, setEditing] = useState(false)

  if (editing && !readOnly)
    return (
      <Textarea
        autoFocus
        spellCheck={false}
        aria-label={label ?? placeholder}
        style={{ minHeight }}
        className={cn('font-mono text-[13px] leading-relaxed', className)}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={() => setEditing(false)}
      />
    )

  const interactive = !readOnly && !!onChange
  return (
    <div
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': `${label ?? placeholder} (click to edit)`,
            onClick: () => setEditing(true),
            onFocus: () => setEditing(true),
          }
        : {})}
      style={{ minHeight }}
      className={cn(
        'prose-chat overflow-y-auto rounded-md border border-input bg-card px-3 py-2 text-[13px] leading-relaxed',
        interactive && 'cursor-text',
        className,
      )}
    >
      {value.trim() ? <Markdown>{value}</Markdown> : <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  )
}
