import { useState } from 'react'
import Markdown from 'react-markdown'

// Notion-style live field: rendered markdown at rest, raw editor on click,
// re-rendered on blur.
export default function MarkdownField({
  value,
  onChange,
  placeholder = 'Write markdown…',
  minHeight = 90,
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minHeight?: number
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)

  if (editing)
    return (
      <textarea
        className="input"
        autoFocus
        spellCheck={false}
        style={{ minHeight, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 1.6, ...style }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
      />
    )

  return (
    <div
      className="input chat-md"
      role="textbox"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
      style={{ minHeight, cursor: 'text', overflowY: 'auto', fontSize: 13, lineHeight: 1.6, ...style }}
    >
      {value.trim() ? <Markdown>{value}</Markdown> : <span className="text-muted">{placeholder}</span>}
    </div>
  )
}
