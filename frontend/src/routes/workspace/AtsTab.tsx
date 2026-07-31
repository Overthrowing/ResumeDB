import { useMutation } from '@tanstack/react-query'
import { Check, FileSearch, TriangleAlert } from 'lucide-react'
import { api, type AuditResult } from '@/lib/api'
import ErrorText from '@/components/ErrorText'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Score bands. Coverage is a judgement call, not a pass/fail, so the bands are
 * deliberately coarse - the number is a prompt to look at the gaps, not a grade. */
function band(score: number) {
  if (score >= 85) return { label: 'Strong coverage', className: 'text-emerald-700', bar: 'bg-emerald-600' }
  if (score >= 65) return { label: 'Decent coverage', className: 'text-primary', bar: 'bg-primary' }
  return { label: 'Thin coverage', className: 'text-destructive', bar: 'bg-destructive' }
}

/** An older data repo's skill still answers with one paragraph. */
function findings(notes: AuditResult['llm']['notes']): string[] {
  if (Array.isArray(notes)) return notes.filter((n) => n.trim())
  return notes?.trim() ? [notes] : []
}

function Keywords({ terms, tone }: { terms: string[]; tone: 'missing' | 'covered' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {terms.map((k) => (
        <span
          key={k}
          className={cn(
            'rounded-md px-2 py-1 text-xs',
            tone === 'missing'
              ? 'bg-destructive/10 font-medium text-destructive ring-1 ring-inset ring-destructive/20'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {k}
        </span>
      ))}
    </div>
  )
}

export default function AtsTab({ appId }: { appId: string }) {
  const auditM = useMutation<AuditResult, Error>({ mutationFn: () => api.audit(appId) })
  const r = auditM.data

  const covered = r?.llm.covered ?? []
  const missing = r?.llm.missing ?? []
  const total = covered.length + missing.length
  const score = typeof r?.llm.score === 'number' ? Math.round(r.llm.score) : null
  const notes = findings(r?.llm.notes)
  const extraction = r?.extraction

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <SectionHeader
          title="ATS check"
          subtitle="How much of the job description this resume covers, and whether a machine can read it back."
          subtitleClassName="mt-0"
        />
        <Button className="flex-none" onClick={() => auditM.mutate()} disabled={auditM.isPending}>
          {auditM.isPending ? 'Auditing…' : r ? 'Re-run audit' : 'Run audit'}
        </Button>
      </div>

      <ErrorText error={auditM.error} />

      {!r && !auditM.isPending && !auditM.error && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileSearch className="mx-auto mb-2 size-5 text-muted-foreground" />
          <div className="text-sm font-medium">No audit yet</div>
          <div className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            Scores the rendered resume against this job's description and checks that every word
            survives PDF text extraction. Render first for the readability half to run.
          </div>
        </div>
      )}

      {auditM.isPending && (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Reading the job description and scoring coverage…
        </div>
      )}

      {r && (
        <div className="flex flex-col gap-5">
          {r.llm.error ? (
            <div className="rounded-lg border border-destructive/40 bg-card p-4">
              <div className="mb-1 font-heading text-sm font-semibold">Keyword coverage</div>
              <div className="text-[13px] text-destructive">{r.llm.error}</div>
            </div>
          ) : (
            <>
              {/* Headline: the number, what it means, and the count behind it. */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-baseline gap-3">
                  <span className={cn('font-heading text-4xl font-semibold tabular-nums', score !== null && band(score).className)}>
                    {score ?? '-'}
                    {score !== null && <span className="text-2xl">%</span>}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{score !== null ? band(score).label : 'Keyword coverage'}</div>
                    <div className="text-xs text-muted-foreground">
                      {total > 0
                        ? `${covered.length} of ${total} job-description terms covered`
                        : 'no terms extracted from the job description'}
                    </div>
                  </div>
                </div>
                {score !== null && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', band(score).bar)} style={{ width: `${score}%` }} />
                  </div>
                )}
              </div>

              {/* Missing first: it is the only part you can act on. */}
              {missing.length > 0 && (
                <section>
                  <h3 className="mb-2 font-heading text-sm font-semibold">
                    Missing <span className="text-muted-foreground">({missing.length})</span>
                  </h3>
                  <Keywords terms={missing} tone="missing" />
                </section>
              )}

              {notes.length > 0 && (
                <section>
                  <h3 className="mb-2 font-heading text-sm font-semibold">What to do about it</h3>
                  <ul className="flex flex-col gap-1.5">
                    {notes.map((n, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                        <span className="mt-1.5 size-1.5 flex-none rounded-full bg-primary" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {covered.length > 0 && (
                <section>
                  <h3 className="mb-2 font-heading text-sm font-semibold">
                    Covered <span className="text-muted-foreground">({covered.length})</span>
                  </h3>
                  <Keywords terms={covered} tone="covered" />
                </section>
              )}
            </>
          )}

          {/* Machine readability is pass/fail and usually passes, so it states
              its result in one line and only expands when something is wrong. */}
          {extraction && (
            <section className="border-t pt-4">
              <h3 className="mb-1.5 flex items-center gap-2 font-heading text-sm font-semibold">
                {extraction.ok ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <TriangleAlert className="size-4 text-destructive" />
                )}
                Machine readability
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {extraction.error
                  ? extraction.error
                  : extraction.ok
                    ? `All ${extraction.checked} resume fields survive PDF text extraction.`
                    : `${extraction.missing.length} of ${extraction.checked} fields lose text when a parser reads the PDF back.`}
              </p>
              {extraction.missing.map((m, i) => (
                <div key={i} className="mt-2 rounded-md border-l-2 border-destructive bg-destructive/5 py-1.5 pl-2.5 pr-2 text-xs">
                  <div>
                    <code className="text-[11px] text-muted-foreground">{m.field}</code> drops{' '}
                    <b className="text-destructive">{m.missing_tokens.join(', ')}</b>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{m.text}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
