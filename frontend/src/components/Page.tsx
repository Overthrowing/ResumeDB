import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The scrolling body of a top-level route. `min-w-0` keeps a wide chat rail
 * from being pushed off screen by long table content. */
export function Page({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('min-w-0 flex-1 overflow-y-auto px-8 py-6', className)}>{children}</div>
}

/** Route-level "title + subtitle", with an optional action pinned to the right. */
export function PageHeader({
  title,
  subtitle,
  subtitleClassName,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  subtitleClassName?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5 flex items-end justify-between', className)}>
      <div>
        <h2 className="font-heading text-[26px] font-semibold leading-tight">{title}</h2>
        {subtitle && (
          <p className={cn('mt-0.5 text-[13px] text-muted-foreground', subtitleClassName)}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/** Section-level "title + subtitle", inside a page section, card, or tab.
 * Spacing below the block is the caller's via `className`. */
export function SectionHeader({
  title,
  subtitle,
  subtitleClassName,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  subtitleClassName?: string
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {subtitle && (
        <p className={cn('mt-1 text-[13px] text-muted-foreground', subtitleClassName)}>{subtitle}</p>
      )}
    </div>
  )
}
