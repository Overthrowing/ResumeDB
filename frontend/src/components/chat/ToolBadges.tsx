import { Badge } from '@/components/ui/badge'

/** Expanded list of the tools a turn called, shown under its disclosure toggle. */
export default function ToolBadges({ tools }: { tools: string[] }) {
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {tools.map((t, i) => (
        <Badge key={i} variant="secondary" className="text-[10px]">
          {t}
        </Badge>
      ))}
    </div>
  )
}
