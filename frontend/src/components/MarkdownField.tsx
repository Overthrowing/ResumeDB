import { useState } from 'react'
import Markdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// Notion-style live field: rendered markdown at rest, raw editor on click,
// re-rendered on blur.
export default function MarkdownField({
  value,
  onChange,
  placeholder = 'Write markdown…',
  minHeight = 90,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}) {
  const [editing, setEditing] = useState(false)

  if (editing)
    return (
      <Textarea
        autoFocus
        spellCheck={false}
        style={{ minHeight }}
        className={cn('font-mono text-[13px] leading-relaxed', className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
      />
    )

  return (
    <div
      role="textbox"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
      style={{ minHeight }}
      className={cn(
        'prose-chat cursor-text overflow-y-auto rounded-md border border-input bg-card px-3 py-2 text-[13px] leading-relaxed',
        className,
      )}
    >
      {value.trim() ? <Markdown>{value}</Markdown> : <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  )
}
