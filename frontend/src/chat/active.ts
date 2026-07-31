import { useQuery } from '@tanstack/react-query'
import { api, type ActiveTurn } from '@/lib/api'
import { useBusyScopes } from '@/chat/store'

/** Every turn running right now, from any tab.
 *
 * The server is the source of truth - turns outlive the page that started them,
 * so a tab that just reloaded knows nothing until it asks. The local store is
 * merged on top because it registers instantly: a message you just sent should
 * show as working without waiting out the poll interval. */
export function useActiveTurns(): ActiveTurn[] {
  const q = useQuery({ queryKey: ['activeTurns'], queryFn: api.activeTurns, refetchInterval: 4000 })
  const busyScopes = useBusyScopes()
  const served = q.data ?? []
  return [
    ...served,
    ...busyScopes
      .filter((s) => !served.some((t) => t.scope === s))
      .map((s) => ({ scope: s, conversation: '', started: Date.now() / 1000, prompt: '' })),
  ]
}
