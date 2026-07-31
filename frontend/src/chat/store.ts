// Chat state lives here, above the router, keyed by scope. Navigating away
// never unmounts a running turn: the WebSocket and stream buffers belong to
// this module, not to any component. The server owns turn durability (turns
// replay on reconnect); this store owns keeping the UI attached.

import { useSyncExternalStore } from 'react'
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
    c = { state: blank(scope), ws: null, listeners: new Set(), onTurnDone: new Set(), onRendered: new Set() }
    chats.set(scope, c)
  }
  return c
}

function set(scope: string, patch: Partial<ChatState>) {
  const c = get(scope)
  c.state = { ...c.state, ...patch }
  c.listeners.forEach((l) => l())
}

// -- websocket lifecycle -------------------------------------------------------

function socket(scope: string): Promise<WebSocket> {
  const c = get(scope)
  if (c.ws && c.ws.readyState === WebSocket.OPEN) return Promise.resolve(c.ws)
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const conv = c.state.convId ?? ''
    const ws = new WebSocket(`${proto}://${location.host}/api/chat?scope=${encodeURIComponent(scope)}&conversation=${conv}`)
    ws.onopen = () => resolve(ws)
    ws.onerror = () => reject(new Error('chat connection failed'))
    ws.onmessage = (e) => handleEvent(scope, JSON.parse(e.data))
    ws.onclose = () => {
      if (c.ws === ws) c.ws = null
    }
    c.ws = ws
  })
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
  const convs = await api.conversations(scope).catch(() => [] as Conversation[])
  set(scope, { conversations: convs })
  return convs
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
    // guard: user may have switched conversations while we fetched
    if (get(scope).state.convId !== id) return
    set(scope, { messages, loaded: true })
    if (active) await socket(scope) // re-attach: server replays the running turn
  } catch {
    set(scope, { messages: [], loaded: true })
  }
}

/** First mount for a scope: load conversation list and most recent conversation. */
export async function ensureLoaded(scope: string) {
  const c = get(scope)
  if (c.state.loaded || c.state.busy) return
  const convs = await refreshConversations(scope)
  const current = c.state.convId ?? convs[0]?.id ?? null
  await loadConversation(scope, current)
  api.proposals().then((p) => set(scope, { proposals: p.filter((x) => !x.error).length })).catch(() => {})
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
  get(scope).ws?.send(JSON.stringify({ type: 'cancel' }))
}

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
  set(scope, { proposals: n })
}

export function useChat(scope: string): ChatState {
  const c = get(scope)
  return useSyncExternalStore(
    (cb) => {
      c.listeners.add(cb)
      return () => c.listeners.delete(cb)
    },
    () => c.state,
  )
}
