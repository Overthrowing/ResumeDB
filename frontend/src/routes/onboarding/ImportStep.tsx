import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api, type ParsedResume } from '@/lib/api'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ImportStep({ onFinish }: { onFinish: () => void }) {
  const [parsing, setParsing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)

  const parse = async (file: File) => {
    setParsing(true)
    try {
      setParsed(await api.importResume(file))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const apply = async () => {
    if (!parsed) return
    setApplying(true)
    try {
      await api.confirmImport(parsed)
      toast.success('Imported into your library')
      onFinish()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <SectionHeader
        title="Seed from your current resume?"
        subtitle="Upload a PDF and the agent converts it into database entries you can refine. Or start fresh - the Library chat can interview you instead."
        className="mb-3"
      />

      {!parsed ? (
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/30',
            parsing && 'pointer-events-none opacity-60',
          )}
        >
          {parsing ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          {parsing ? 'Parsing your resume with the agent…' : 'Drop your resume PDF here or click to choose'}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) parse(f)
              e.target.value = ''
            }}
          />
        </label>
      ) : (
        <div>
          <div className="mb-2 text-sm">
            Parsed <b>{parsed.entries.length}</b> entries for <b>{parsed.profile.name}</b>:
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border">
            {parsed.entries.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b px-3 py-2 text-[13px] last:border-0">
                <Badge variant="secondary" className="text-[10px]">
                  {e.type}
                </Badge>
                <span className="truncate">
                  {e.title}
                  {e.org ? ` · ${e.org}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setParsed(null)}>
              Re-upload
            </Button>
            <Button onClick={apply} disabled={applying}>
              {applying && <Loader2 className="size-3.5 animate-spin" />}
              Import {parsed.entries.length} entries
            </Button>
          </div>
        </div>
      )}

      {!parsed && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onFinish}>
            Skip & start fresh
          </Button>
        </div>
      )}
    </div>
  )
}
