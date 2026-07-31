import { byPhase, isTerminal, statusMeta } from '@/lib/status'
import { cn } from '@/lib/utils'

// The happy path shown as a strip. Terminal states are an end cap instead of a
// step, since they can be reached from anywhere.
const PIPELINE = [...byPhase('pre'), ...byPhase('submitted')]

/** Progress strip for one application: the happy path as steps, with the
 * terminal state (if any) as an end cap. */
export default function StatusPipeline({ status }: { status: string }) {
  const closed = isTerminal(status)
  const currentIdx = PIPELINE.findIndex((s) => s.id === status)

  return (
    <div className="mb-6 flex items-center py-3">
      {PIPELINE.map((step, i) => {
        const isActive = step.id === status
        const isPast = closed ? true : i < currentIdx
        return (
          <div key={step.id} className={cn('flex items-center', i < PIPELINE.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn('rounded-full transition-all', isActive ? 'size-4 ring-4 ring-primary/20' : 'size-2.5')}
                style={{ background: isActive || isPast ? step.color : 'var(--border)' }}
              />
              <span
                className={cn(
                  'whitespace-nowrap text-[10px]',
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div
                className="mx-1.5 mb-4 h-0.5 flex-1"
                style={{ background: isPast ? PIPELINE[i + 1].color : 'var(--border)' }}
              />
            )}
          </div>
        )
      })}
      {closed && (
        <>
          <div className="mx-1.5 mb-4 h-0.5 w-6" style={{ background: statusMeta(status).color }} />
          <div className="flex flex-col items-center gap-1">
            <div
              className="size-4 rounded-full ring-4 ring-primary/20"
              style={{ background: statusMeta(status).color }}
            />
            <span className="whitespace-nowrap text-[10px] font-semibold">{statusMeta(status).label}</span>
          </div>
        </>
      )}
    </div>
  )
}
