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
}

export interface Profile {
  name?: string
  email?: string
  phone?: string
  location?: string
  links?: { label: string; url: string }[]
}

export interface Memory {
  content: string
}

export interface AppMeta {
  id: string
  company: string
  role: string
  template: string
  created: string
  status: string
  deadline?: string
  source?: string
  session_id?: string | null
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
  claude_bin: string | null
  models: ModelConfig
}

export interface Health {
  agent_provider: string
  claude: string | null
  claude_version: string | null
  codex: string | null
  codex_version: string | null
  typst: string | null
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

export interface JobLead {
  company: string
  role: string
  location?: string
  term?: string
  department?: string
  team?: string
  deadline?: string | null
  salary_amount?: number | null
  salary_currency?: string
  salary_period?: string
  priority?: number
  what_they_look_for?: string
  good_to_know?: string
  job_description?: string
  notes?: string
  application_url?: string
  source_url?: string
}

export interface ResearchRun {
  id: string
  kind: 'search' | 'ingest'
  query: string
  status: 'pending' | 'completed' | 'failed'
  summary: string
  created_at: string
  error?: string | null
  result?: {
    summary?: string
    job?: JobLead
    jobs?: JobLead[]
  } | null
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* not json */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  health: () => req<Health>('/api/health'),
  config: () => req<Config>('/api/config'),
  saveConfig: (cfg: Partial<Config>) => req<Config>('/api/config', json('PUT', cfg)),
  initDatarepo: (path?: string) => req<{ ok: boolean }>('/api/datarepo/init', json('POST', { path })),
  pickFolder: () => req<{ path: string | null }>('/api/pick-folder', { method: 'POST' }),

  entries: () => req<Entry[]>('/api/db/entries'),
  saveEntry: (id: string, e: Omit<Entry, 'id'>) => req<{ ok: boolean }>(`/api/db/entries/${id}`, json('PUT', e)),
  deleteEntry: (id: string) => req<{ ok: boolean }>(`/api/db/entries/${id}`, { method: 'DELETE' }),
  profile: () => req<Profile>('/api/db/profile'),
  saveProfile: (p: Profile) => req<{ ok: boolean }>('/api/db/profile', json('PUT', p)),
  memory: () => req<Memory>('/api/db/memory'),
  saveMemory: (content: string) => req<{ ok: boolean }>('/api/db/memory', json('PUT', { content })),

  proposals: () => req<Proposal[]>('/api/proposals'),
  approveProposal: (name: string) => req<{ ok: boolean }>(`/api/proposals/${name}/approve`, { method: 'POST' }),
  rejectProposal: (name: string) => req<{ ok: boolean }>(`/api/proposals/${name}/reject`, { method: 'POST' }),

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
  historyDiff: async (sha: string) => {
    const res = await fetch(`/api/history/${sha}/diff`)
    if (!res.ok) throw new Error(res.statusText)
    return res.text()
  },
  revert: (sha: string) => req<{ ok: boolean }>(`/api/history/${sha}/revert`, { method: 'POST' }),

  agentIngest: (body: { input: string }) => req<{ run_id: string; summary: string; job: JobLead }>('/api/agent/ingest', json('POST', body)),
  agentSearch: (body: { query: string }) => req<{ run_id: string; summary: string; jobs: JobLead[] }>('/api/agent/search', json('POST', body)),
  runs: (limit?: number) => req<ResearchRun[]>(`/api/agent/runs${limit ? `?limit=${limit}` : ''}`),
  run: (id: string) => req<ResearchRun>(`/api/agent/runs/${id}`),
  generateInterviewQuestions: (id: string) => req<InterviewQuestion[]>(`/api/applications/${id}/interview/generate`, { method: 'POST' }),
  getInterviewQuestions: (id: string) => req<InterviewQuestion[]>(`/api/applications/${id}/interview/questions`),
}

export interface InterviewQuestion {
  id: string
  type: 'behavioral' | 'technical' | 'situational'
  question: string
  context: string
  tips: string
}

