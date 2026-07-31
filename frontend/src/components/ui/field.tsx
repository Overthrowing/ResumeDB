import { cloneElement, useId, type ReactElement } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Label + control with a generated id wired between them, so every field has
 * an accessible name. Replaces the sibling `<Label>` + `<Input>` pattern,
 * which left every input unnamed for screen readers.
 */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactElement<{ id?: string }>
}) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 text-xs">
        {label}
        {hint && <span className="font-normal normal-case text-muted-foreground">{hint}</span>}
      </Label>
      {cloneElement(children, { id })}
    </div>
  )
}
