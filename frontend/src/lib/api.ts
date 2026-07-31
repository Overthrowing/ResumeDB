export interface Entry {
  id: string
  type: 'experience' | 'project' | 'skill' | 'course' | 'education' | 'achievement' | 'extra'
  title: string
  org?: string
  location?: string
  start?: string
  end?: string
  tags?: string[]
  links?: { label: string; url: string }[]
  bullets?: string[]
  items?: string[]
  notes?: string
  /** Per-file parse failure surfaced by list_entries; null when the file read fine. */
  error?: string | null
}

export interface Profile {
  name?: string
  email?: string
  phone?: string
  location?: string
  links?: { label: string; url: string }[]
}

export type AppStatus =
  | 'not_started'
  | 'in_progress'
  | 'awaiting_review'
  | 'ready'
  | 'applied'
  | 'screen'
  | 'interview'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'ghosted'
  | 'withdrawn'

export interface StatusEvent {
  status: AppStatus
  date: string
}

export interface AppMeta {
  id: string
  company: string
  role: string
  /** Absent on legacy or hand-edited meta.yaml files. */
  template?: string
  created?: string
  /** A legacy or hand-edited meta.yaml can hold a status outside the union;
   * `string & {}` keeps the known statuses autocompleting while typing those. */
  status: AppStatus | (string & {})
  history?: StatusEvent[]
  deadline?: string
  source?: string
  outcome_note?: string
  /** Per-file parse failure surfaced by list_applications; null when meta.yaml read fine. */
  error?: string | null
}

export interface Application {
  meta: AppMeta
  files: Record<string, string>
  has_pdf: boolean
}

export interface ModelConfig {
  chat: string | null
  chat_effort: string | null
  tailor: string | null
  tailor_effort: string | null
  audit: string | null
  audit_effort: string | null
  jd: string | null
  jd_effort: string | null
}

export interface Config {
  data_repo: string
  agent_provider: 'claude' | 'codex'
  claude_bin: string | null
  codex_bin: string | null
  models: ModelConfig
}

export interface Health {
  agent_provider: string
  claude: string | null
  codex: string | null
  typst: string | null
  data_repo: string
  data_repo_ok: boolean
}

export interface EnvCheck {
  claude: { installed: boolean; version: string | null; authed: boolean }
  codex: { installed: boolean; version: string | null; authed: boolean | null }
  typst: { installed: boolean; version: string | null }
  data_repo: string
  data_repo_ok: boolean
}

export interface HistoryEntry {
  sha: string
  timestamp: number
  subject: string
}

export interface RenderResult {
  ok: boolean
  pages: number
  overflow?: boolean
  stderr: string
}

export interface Proposal {
  name: string
  target: string | null
  data: Record<string, unknown>
  error?: string | null
}

export interface AuditResult {
  extraction: {
    ok: boolean
    missing: { field: string; text: string; missing_tokens: string[] }[]
    checked: number
    error: string | null
  }
  llm: {
    score?: number
    covered?: string[]
    missing?: string[]
    notes?: string
    error?: string
  }
}

export interface Conversation {
  id: string
  title: string
  created: number
  count: number
  active: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error' | 'warning'
  text: string
  tools?: string[]
  interrupted?: boolean
}

export interface ParsedResume {
  profile: Profile
  entries: Entry[]
}

/** Fetch, turning the backend's {error, detail} envelope into a thrown Error. */
async function send(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? body.error ?? detail
    } catch {
      /* not json */
    }
    throw new Error(detail)
  }
  return res
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  return (await send(url, init)).json() as Promise<T>
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  health: () => req<Health>('/api/health'),
  env: () => req<EnvCheck>('/api/env'),
  config: () => req<Config>('/api/config'),
  saveConfig: (cfg: Partial<Config> & { models?: Partial<ModelConfig> }) =>
    req<Config>('/api/config', json('PUT', cfg)),
  initDatarepo: (path?: string) =>
    req<{ ok: boolean; path: string }>('/api/datarepo/init', json('POST', { path })),
  pickFolder: () => req<{ path: string | null }>('/api/pick-folder', { method: 'POST' }),

  entries: () => req<Entry[]>('/api/db/entries'),
  saveEntry: (id: string, e: Omit<Entry, 'id'>) => req<{ ok: boolean }>(`/api/db/entries/${id}`, json('PUT', e)),
  deleteEntry: (id: string) => req<{ ok: boolean }>(`/api/db/entries/${id}`, { method: 'DELETE' }),
  profile: () => req<Profile>('/api/db/profile'),
  saveProfile: (p: Profile) => req<{ ok: boolean }>('/api/db/profile', json('PUT', p)),
  memory: () => req<{ content: string }>('/api/db/memory'),
  saveMemory: (content: string) => req<{ ok: boolean }>('/api/db/memory', json('PUT', { content })),

  proposals: () => req<Proposal[]>('/api/proposals'),
  approveProposal: (name: string) =>
    req<{ ok: boolean; target: string }>(`/api/proposals/${name}/approve`, { method: 'POST' }),
  approveAllProposals: () =>
    req<{ approved: string[]; skipped: string[] }>('/api/proposals/approve-all', { method: 'POST' }),
  rejectProposal: (name: string) => req<{ ok: boolean }>(`/api/proposals/${name}/reject`, { method: 'POST' }),

  upload: (scope: string, file: File) => {
    const fd = new FormData()
    fd.append('scope', scope)
    fd.append('file', file)
    return req<{ path: string }>('/api/upload', { method: 'POST', body: fd })
  },

  applications: () => req<AppMeta[]>('/api/applications'),
  createApplication: (body: { company: string; role: string; jd_text?: string; jd_url?: string; template?: string }) =>
    req<{ ok: boolean; id: string }>('/api/applications', json('POST', body)),
  application: (id: string) => req<Application>(`/api/applications/${id}`),
  saveAppFile: (id: string, name: string, content: string) =>
    req<{ ok: boolean }>(`/api/applications/${id}/files/${name}`, json('PUT', { content })),
  saveAppMeta: (id: string, updates: Partial<AppMeta>) =>
    req<{ ok: boolean }>(`/api/applications/${id}/meta`, json('PUT', updates)),
  render: (id: string) => req<RenderResult>(`/api/applications/${id}/render`, { method: 'POST' }),
  audit: (id: string) => req<AuditResult>(`/api/applications/${id}/audit`, { method: 'POST' }),

  templates: () => req<string[]>('/api/templates'),

  history: (scope: string) => req<HistoryEntry[]>(`/api/history?scope=${encodeURIComponent(scope)}`),
  historyDiff: async (sha: string) => (await send(`/api/history/${sha}/diff`)).text(),
  revert: (sha: string) => req<{ ok: boolean }>(`/api/history/${sha}/revert`, { method: 'POST' }),

  conversations: (scope: string) => req<Conversation[]>(`/api/chat/${encodeURIComponent(scope)}/conversations`),
  conversation: (scope: string, id: string) =>
    req<{ messages: ChatMessage[]; active: boolean }>(
      `/api/chat/${encodeURIComponent(scope)}/conversations/${id}`,
    ),
  deleteConversation: (scope: string, id: string) =>
    req<{ ok: boolean }>(`/api/chat/${encodeURIComponent(scope)}/conversations/${id}`, { method: 'DELETE' }),

  importResume: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return req<ParsedResume>('/api/import/resume', { method: 'POST', body: fd })
  },
  confirmImport: (parsed: ParsedResume) => req<{ ok: boolean }>('/api/import/resume/confirm', json('POST', parsed)),
}
