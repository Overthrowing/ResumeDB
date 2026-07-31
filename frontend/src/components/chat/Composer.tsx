import { useEffect, useRef, useState } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cancelTurn, sendMessage } from '@/chat/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MODELS, modelLabel, type ModelKind } from '@/lib/models'

/** Model picker, attachment tray, and the message box. Owns the draft so a
 * keystroke does not re-render the transcript above it. */
export default function Composer({
  scope,
  placeholder,
  busy,
  model,
  modelKind,
  onModelChange,
}: {
  scope: string
  placeholder: string
  busy: boolean
  model: string
  modelKind: ModelKind
  onModelChange: (m: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || busy) return
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
    if ((!text && files.length === 0) || busy) return
    if (files.length > 0) {
      const note = `[Attached file${files.length === 1 ? '' : 's'}: ${files.join(', ')}]`
      text = text ? `${text}\n\n${note}` : note
    }
    setDraft('')
    setAttachments([])
    sendMessage(scope, text, model)
  }

  return (
    <div className="flex-none border-t px-3 pb-3 pt-2">
      <div className="mb-1 flex justify-end">
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          title="Model for this chat"
          className="cursor-pointer border-none bg-transparent text-right text-[11px] text-muted-foreground outline-none"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {modelLabel(m, modelKind)}
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
            disabled={uploading || busy}
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
          {busy ? (
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
  )
}
