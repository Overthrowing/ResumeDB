import { useMemo } from 'react'
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey'
import { STATUS_ORDER, statusMeta } from '@/lib/status'

export interface Flow {
  source: string
  target: string
  value: number
}

interface Node {
  id: string
  // filled in by d3-sankey
  x0?: number
  x1?: number
  y0?: number
  y1?: number
  value?: number
}

interface Link {
  source: number | Node
  target: number | Node
  value: number
  width?: number
}

const WIDTH = 780
const NODE_W = 13
const PAD = 16

/**
 * Status-transition Sankey. d3-sankey computes geometry only; the SVG is ours,
 * so the palette stays on the app's status colors.
 */
export default function Sankey({ flows }: { flows: Flow[] }) {
  const height = Math.max(240, Math.min(560, 60 + flows.length * 34))

  const layout = useMemo(() => {
    if (flows.length === 0) return null
    const ids = Array.from(new Set(flows.flatMap((f) => [f.source, f.target]))).sort(
      (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b),
    )
    const index = new Map(ids.map((id, i) => [id, i]))
    const gen = sankey<Node, Link>()
      .nodeWidth(NODE_W)
      .nodePadding(PAD)
      .nodeAlign(sankeyJustify)
      .extent([
        [1, 8],
        [WIDTH - 1, height - 8],
      ])
    try {
      return gen({
        nodes: ids.map((id) => ({ id })),
        links: flows.map((f) => ({
          source: index.get(f.source)!,
          target: index.get(f.target)!,
          value: f.value,
        })),
      })
    } catch {
      return null // cyclic or degenerate input: caller shows the empty state
    }
  }, [flows, height])

  if (!layout)
    return (
      <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Not enough movement to chart yet. Advance a couple of applications past
        <span className="mx-1 font-medium text-foreground">Applied</span>
        and the flow shows up here.
      </div>
    )

  const path = sankeyLinkHorizontal<Node, Link>()

  return (
    <div className="overflow-x-auto rounded-lg border bg-card p-4">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full min-w-[640px]" role="img" aria-label="Application status flow">
        <g>
          {layout.links.map((l, i) => {
            const target = l.target as Node
            return (
              <path
                key={i}
                d={path(l) ?? undefined}
                fill="none"
                stroke={statusMeta(target.id).color}
                strokeOpacity={0.28}
                strokeWidth={Math.max(1, l.width ?? 1)}
              >
                <title>
                  {statusMeta((l.source as Node).id).label} → {statusMeta(target.id).label}: {l.value}
                </title>
              </path>
            )
          })}
        </g>
        <g>
          {layout.nodes.map((n) => {
            const meta = statusMeta(n.id)
            const h = (n.y1 ?? 0) - (n.y0 ?? 0)
            const labelRight = (n.x0 ?? 0) < WIDTH / 2
            return (
              <g key={n.id}>
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                  height={Math.max(1, h)}
                  fill={meta.color}
                  rx={2}
                >
                  <title>
                    {meta.label}: {n.value}
                  </title>
                </rect>
                <text
                  x={labelRight ? (n.x1 ?? 0) + 6 : (n.x0 ?? 0) - 6}
                  y={(n.y0 ?? 0) + h / 2}
                  dy="0.35em"
                  textAnchor={labelRight ? 'start' : 'end'}
                  className="fill-foreground text-[11px]"
                >
                  {meta.label}
                  <tspan className="fill-muted-foreground"> {n.value}</tspan>
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
