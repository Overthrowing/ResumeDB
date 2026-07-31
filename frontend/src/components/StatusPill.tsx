import type { ComponentProps } from 'react'
import { statusMeta } from '@/lib/status'
import { cn } from '@/lib/utils'

/**
 * Status chip for the applications table, the workspace header, and the
 * outcomes legend. Children override the default label - the legend appends a
 * count to it.
 */
export default function StatusPill({
  status,
  className,
  children,
  ...props
}: { status: string | undefined } & ComponentProps<'span'>) {
  const meta = statusMeta(status)
  return (
    <span className={cn('rounded px-2.5 py-0.5 text-[11px] font-semibold', meta.pill, className)} {...props}>
      {children ?? meta.label}
    </span>
  )
}
