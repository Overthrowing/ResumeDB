import { cn } from '@/lib/utils'

/**
 * Inline error line for a failed query or mutation. Renders nothing when there
 * is no error, so call sites stop repeating the `isError` guard and the cast
 * TanStack Query's `unknown` error needs.
 */
export default function ErrorText({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null
  return <div className={cn('text-[13px] text-destructive', className)}>{(error as Error).message}</div>
}
