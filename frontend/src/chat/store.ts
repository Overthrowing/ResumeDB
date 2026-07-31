// Chat state lives here, above the router, keyed by scope. Navigating away
// never unmounts a running turn: the WebSocket and stream buffers belong to
// this module, not to any component. The server owns turn durability (turns
// replay on reconnect); this store owns keeping the UI attached.

import { useCallback, useSyncExternalStore } from 'react'
import { api, type ChatMessage, type Conversation } from '@/lib/api'

export interface ChatState {
  scope: string
  convId: string | null
  conversations: Conversation[]
  messages: ChatMessage[]
  busy: boolean
  streaming: string
  thinking: string
  tools: string[]
  proposals: number
  loaded: boolean
}

interface Internal {
  state: ChatState
  ws: WebSocket | null
  /** In-flight connect/load, so StrictMode's double mount cannot open two
   * sockets or run two loads against the same scope. */
  connecting: Promise<WebSocket> | null
  loading: Promise<void> | null
  listeners: Set<() => void>
  onTurnDone: Set<() => void>
  onRendered: Set<(pages: number, ok: boolean) => void>
}

const chats = new Map<string, Internal>()

function blank(scope: string): ChatState {
  return {
    scope,
    convId: null,
    conversations: [],
    messages: [],
    busy: false,
    streaming: '',
    thinking: '',
    tools: [],
    proposals: 0,
    loaded: false,
  }
}

function get(scope: string): Internal {
  let c = chats.get(scope)
  if (!c) {
    c = {
      state: blank(scope),
      ws: null,
      connecting: null,
      loading: null,
      listeners: new Set(),
      onTurnDone: new Set(),
      onRendered: new Set(),
    }
    chats.set(scope, c)
  }
  return c
}

function set(scope: string, patch: Partial<ChatState>) {
  const c = get(scope)
  c.state = { ...c.state, ...patch }
  c.listeners.forEach((l) => l())
  if ('busy' in patch) refreshBusy()
}

// -- which scopes are working, for callers outside those scopes ---------------
// Turns keep running when you navigate away, so a list of applications has to
// be able to say which of them are mid-turn without mounting their chats.

const busyListeners = new Set<() => void>()
let busyScopes: string[] = []

function refreshBusy() {
  const next = [...chats].filter(([, c]) => c.state.busy).map(([s]) => s).sort()
  // useSyncExternalStore compares snapshots by identity, so only swap the array
  // when membership actually changed: a redundant `busy` patch (turn_done after
  // a socket close already cleared it) must not re-render every subscriber.
  if (next.length === busyScopes.length && next.every((s, i) => s === busyScopes[i])) return
  busyScopes = next
  busyListeners.forEach((l) => l())
}

export function useBusyScopes(): string[] {
  return useSyncExternalStore(
    useCallback((cb: () => void) => {
      busyListeners.add(cb)
      return () => busyListeners.delete(cb)
    }, []),
    () => busyScopes,
  )
}

// -- websocket lifecycle -------------------------------------------------------

function socket(scope: string): Promise<WebSocket> {
  const c = get(scope)
  if (c.ws && c.ws.readyState === WebSocket.OPEN) return Promise.resolve(c.ws)
  if (c.connecting) return c.connecting // a connect is already in flight
  c.connecting = new Promise<WebSocket>((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const conv = c.state.convId ?? ''
    const ws = new WebSocket(
      `${proto}://${location.host}/api/chat?scope=${encodeURIComponent(scope)}&conversation=${conv}`,
    )
    ws.onopen = () => {
      c.connecting = null
      resolve(ws)
    }
    ws.onerror = () => {
      c.connecting = null
      reject(new Error('chat connection failed'))
    }
    ws.onmessage = (e) => handleEvent(scope, JSON.parse(e.data))
    ws.onclose = () => {
      if (c.ws === ws) c.ws = null
      c.connecting = null
      // The turn keeps running server-side, but this client is no longer
      // hearing it. Never leave `busy` stuck true - it disables the composer,
      // "New conversation", and any reload of this conversation.
      if (c.state.busy) {
        set(scope, {
          busy: false,
          streaming: '',
          thinking: '',
          tools: [],
          messages: [
            ...c.state.messages,
            {
              role: 'error',
              text: 'Connection lost. The turn may still be running on the server - reopen this conversation to re-attach.',
            },
          ],
        })
      }
    }
    c.ws = ws
  })
  return c.connecting
}

function handleEvent(scope: string, ev: { type: string; [k: string]: unknown }) {
  const c = get(scope)
  const s = c.state
  switch (ev.type) {
    case 'turn_start':
      // replay entry point: reset stream buffers, mark busy
      set(scope, { busy: true, streaming: '', thinking: '', tools: [] })
      break
    case 'text_delta':
      set(scope, { streaming: s.streaming + (ev.text as string) })
      break
    case 'thinking_delta':
      set(scope, { thinking: s.thinking + (ev.text as string) })
      break
    case 'tool_use':
      set(scope, { tools: [...s.tools, ev.name as string] })
      break
    case 'result':
      set(scope, {
        messages: [...s.messages, { role: 'assistant', text: (ev.text as string) || s.streaming, tools: s.tools }],
        streaming: '',
        thinking: '',
        tools: [],
      })
      break
    case 'error':
      set(scope, {
        messages: [...s.messages, { role: 'error', text: ev.message as string }],
        streaming: '',
        thinking: '',
        tools: [],
        busy: false,
      })
      break
    case 'warning':
      set(scope, { messages: [...s.messages, { role: 'warning', text: ev.message as string }] })
      break
    case 'rendered':
      c.onRendered.forEach((f) => f(ev.pages as number, ev.ok as boolean))
      break
    case 'proposals':
      set(scope, { proposals: ev.count as number })
      break
    case 'conversation':
      set(scope, { convId: ev.id as string })
      break
    case 'turn_done':
      set(scope, { busy: false })
      refreshConversations(scope)
      c.onTurnDone.forEach((f) => f())
      break
  }
}

// -- public API ----------------------------------------------------------------

export async function refreshConversations(scope: string): Promise<Conversation[]> {
  try {
    const convs = await api.conversations(scope)
    set(scope, { conversations: convs })
    return convs
  } catch {
    // keep whatever list we had: blanking it on a transient failure would
    // strand the user with "No conversations yet" for the whole session
    return get(scope).state.conversations
  }
}

export async function loadConversation(scope: string, id: string | null) {
  const c = get(scope)
  if (c.state.busy && c.state.convId === id) return // already attached and streaming
  c.ws?.close()
  c.ws = null
  set(scope, { convId: id, messages: [], streaming: '', thinking: '', tools: [], busy: false, loaded: id === null })
  if (!id) return
  try {
    const { messages, active } = await api.conversation(scope, id)
    const now = get(scope).state
    // the user may have switched conversations, or sent a message, while we
    // fetched - never clobber either
    if (now.convId !== id || now.busy) return
    set(scope, { messages, loaded: true })
    if (active) await socket(scope) // re-attach: server replays the running turn
  } catch {
    if (get(scope).state.convId === id) set(scope, { messages: [], loaded: false })
  }
}

/** First mount for a scope: load conversation list and most recent conversation. */
export function ensureLoaded(scope: string): Promise<void> {
  const c = get(scope)
  if (c.state.loaded || c.state.busy) return Promise.resolve()
  if (c.loading) return c.loading // StrictMode double-mount lands here
  c.loading = (async () => {
    try {
      const convs = await refreshConversations(scope)
      await loadConversation(scope, c.state.convId ?? convs[0]?.id ?? null)
    } finally {
      c.loading = null
    }
  })()
  return c.loading
}

export async function sendMessage(scope: string, text: string, model?: string) {
  const c = get(scope)
  if (c.state.busy) return
  set(scope, {
    messages: [...c.state.messages, { role: 'user', text }],
    busy: true,
    streaming: '',
    thinking: '',
    tools: [],
  })
  try {
    const ws = await socket(scope)
    ws.send(JSON.stringify({ type: 'message', text, model: model || undefined }))
  } catch (e) {
    set(scope, {
      messages: [...get(scope).state.messages, { role: 'error', text: (e as Error).message }],
      busy: false,
    })
  }
}

export function cancelTurn(scope: string) {
  const ws = get(scope).ws
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'cancel' }))
  else set(scope, { busy: false }) // socket already gone; unstick the composer
}

/** Throws on failure (e.g. the server's 409 while a turn runs) so the caller
 * can surface it - a silent no-op reads as a broken button. */
export async function deleteConversation(scope: string, id: string) {
  await api.deleteConversation(scope, id)
  const convs = await refreshConversations(scope)
  if (get(scope).state.convId === id) await loadConversation(scope, convs[0]?.id ?? null)
}

export function newConversation(scope: string) {
  loadConversation(scope, null)
}

export function onTurnDone(scope: string, fn: () => void): () => void {
  const c = get(scope)
  c.onTurnDone.add(fn)
  return () => c.onTurnDone.delete(fn)
}

export function onRendered(scope: string, fn: (pages: number, ok: boolean) => void): () => void {
  const c = get(scope)
  c.onRendered.add(fn)
  return () => c.onRendered.delete(fn)
}

export function setProposalCount(scope: string, n: number) {
  if (get(scope).state.proposals !== n) set(scope, { proposals: n })
}

export function useChat(scope: string): ChatState {
  const c = get(scope)
  const subscribe = useCallback(
    (cb: () => void) => {
      c.listeners.add(cb)
      return () => c.listeners.delete(cb)
    },
    [c],
  )
  return useSyncExternalStore(subscribe, () => c.state)
}
