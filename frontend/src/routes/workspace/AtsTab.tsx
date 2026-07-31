import { useMutation } from '@tanstack/react-query'
import { api, type AuditResult } from '@/lib/api'
import ErrorText from '@/components/ErrorText'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AtsTab({ appId }: { appId: string }) {
  const auditM = useMutation<AuditResult, Error>({ mutationFn: () => api.audit(appId) })
  const r = auditM.data

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader
          title="ATS check"
          subtitle="Machine-extraction diff of the rendered PDF plus an LLM keyword-coverage rubric against the JD."
          subtitleClassName="mt-0"
        />
        <Button onClick={() => auditM.mutate()} disabled={auditM.isPending}>
          {auditM.isPending ? 'Auditing…' : 'Run audit'}
        </Button>
      </div>

      <ErrorText error={auditM.error} />
      {auditM.isPending && (
        <div className="text-sm text-muted-foreground">Running extraction check and LLM rubric…</div>
      )}

      {r && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 font-heading text-sm font-semibold">
              Extraction check{' '}
              <Badge className="ml-1" variant={r.extraction.ok ? 'default' : 'destructive'}>
                {r.extraction.ok ? 'clean' : `${r.extraction.missing.length} problems`}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.extraction.error
                ? r.extraction.error
                : `${r.extraction.checked} fields checked against the PDF text layer.`}
            </div>
            {r.extraction.missing.map((m, i) => (
              <div key={i} className="mt-2 border-l-2 border-destructive pl-2.5 text-xs">
                <b>{m.field}</b>: missing {m.missing_tokens.join(', ')}
                <div className="text-muted-foreground">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 font-heading text-sm font-semibold">
              Keyword coverage
              {typeof r.llm.score === 'number' && <Badge className="ml-2">{Math.round(r.llm.score)}%</Badge>}
            </div>
            {r.llm.error ? (
              <div className="text-xs text-destructive">{r.llm.error}</div>
            ) : (
              <>
                {r.llm.notes && <p className="mb-2 text-[13px]">{r.llm.notes}</p>}
                <div className="flex flex-wrap gap-1">
                  {(r.llm.covered ?? []).map((k) => (
                    <Badge key={k} variant="secondary" className="bg-emerald-100 text-emerald-800">
                      {k}
                    </Badge>
                  ))}
                  {(r.llm.missing ?? []).map((k) => (
                    <Badge key={k} variant="secondary" className="bg-red-100 text-red-800">
                      {k}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
