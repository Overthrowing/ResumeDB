import { useState } from 'react'
import { FolderOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function RepoStep({
  path,
  setPath,
  onDone,
}: {
  path: string
  setPath: (p: string) => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)

  const pick = async () => {
    try {
      const { path: picked } = await api.pickFolder()
      if (picked) setPath(picked)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const init = async () => {
    setBusy(true)
    try {
      await api.initDatarepo(path)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <SectionHeader
        title="Where should your career data live?"
        subtitle="A plain folder of YAML + markdown, versioned with git. Yours forever - readable without this app. Pointing at an existing ResumeDB folder adopts it as-is."
        className="mb-3"
      />
      <div className="flex items-end gap-2">
        <Field label="Data folder" className="min-w-0 flex-1">
          <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/Users/you/resume-data" />
        </Field>
        <Button variant="outline" onClick={pick}>
          <FolderOpen className="size-4" />
          Browse…
        </Button>
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={!path || busy} onClick={init}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {busy ? 'Setting up…' : 'Create / adopt folder'}
        </Button>
      </div>
    </div>
  )
}
