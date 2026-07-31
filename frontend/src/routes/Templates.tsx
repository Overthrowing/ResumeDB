import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DEFAULT_TEMPLATE } from '@/lib/templates'
import ErrorText from '@/components/ErrorText'
import { Page, PageHeader } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'

export default function Templates() {
  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: api.templates })

  return (
    <Page>
      <PageHeader
        title="Templates"
        subtitle="Typst templates in your data repo. Ask any assistant chat for a new one - agents author and compile-check them."
      />
      <ErrorText error={templatesQ.error} className="mb-3" />
      <div className="grid max-w-3xl grid-cols-3 gap-3">
        {(templatesQ.data ?? []).map((t) => (
          <Card key={t} className="gap-2 py-4">
            <CardContent className="px-4">
              <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Typst{t === DEFAULT_TEMPLATE ? ' · default' : ''}
              </div>
              <div className="mt-1 font-heading text-lg font-semibold">{t}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                templates/{t}.typ - single column, ATS-safe per the schema contract.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Page>
  )
}
