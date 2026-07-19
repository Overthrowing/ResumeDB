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
  college?: string
  major?: string
  degree?: string
  graduation_year?: string
  work_authorization?: string
  requires_sponsorship?: string
  preferred_roles?: string[]
  preferred_locations?: string[]
  application_answers?: Record<string, string | boolean | number | null>
  links?: { label: string; url: string }[]
}

export interface Memory {
  content: string
}

export type AppStatus = 'not_started' | 'in_progress' | 'draft' | 'ready' | 'submitted'

export interface AppMeta {
  id: string
  company: string
  role: string
  template: string
  created: string
  status: AppStatus
  deadline?: string
  source?: string
  session_id?: string | null
  submitted_at?: string | null
  fit_score?: number | null
  fit_summary?: string | null
  outcome?: string | null
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
  id?: string
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
  canonical_url?: string
  fit_score?: number
  fit_level?: 'high' | 'medium' | 'low'
  fit_summary?: string
  evidence?: string[]
  missing_facts?: string[]
  hard_conflicts?: string[]
  status?: 'inbox' | 'preparing' | 'tracked' | 'dismissed'
  application_id?: string
  preparation_error?: string
}

export interface SearchSubscription {
  id: string
  query: string
  enabled: boolean
  created_at: string
  last_run_at?: string | null
  last_attempt_at?: string | null
  last_error?: string | null
}

export interface ReadinessIssue {
  key: string
  label: string
  message: string
}

export interface ReadinessReport {
  ready: boolean
  score: number
  blockers: ReadinessIssue[]
  warnings: ReadinessIssue[]
  status: AppStatus
}

export interface ApplicationAnswer {
  key: string
  question: string
  value: string | boolean | number | null
  required: boolean
  source: string
}

export interface AutofillPackage {
  profile: Profile
  answers: ApplicationAnswer[]
  missing: Array<{ key: string; label: string; required: boolean; message: string }>
  application: Application
  readiness: ReadinessReport
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
  readiness: (id: string) => req<ReadinessReport>(`/api/applications/${id}/readiness`),
  prepare: (id: string) => req<{ application: Application; readiness: ReadinessReport; render: RenderResult }>(`/api/applications/${id}/prepare`, { method: 'POST' }),
  approve: (id: string) => req<ReadinessReport>(`/api/applications/${id}/approve`, { method: 'POST' }),
  markSubmitted: (id: string) => req<{ ok: boolean; application: Application }>(`/api/applications/${id}/submitted`, { method: 'POST' }),
  autofillPackage: (id: string) => req<AutofillPackage>(`/api/applications/${id}/autofill-package`),

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
  agentCommand: (command: string, autoPrepare = true) =>
    req<{ intent: 'add_job' | 'discover'; summary: string; search_goal?: string | null; jobs: JobLead[] }>(
      '/api/agent/command',
      json('POST', { command, auto_prepare: autoPrepare }),
    ),
  jobLeads: (status?: string) => req<JobLead[]>(`/api/agent/jobs${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  trackLead: (id: string) => req<{ ok: boolean; application_id: string }>(`/api/agent/jobs/${id}/track`, { method: 'POST' }),
  prepareLead: (id: string) => req<{ ok: boolean; application_id: string }>(`/api/agent/jobs/${id}/prepare`, { method: 'POST' }),
  dismissLead: (id: string) => req<JobLead>(`/api/agent/jobs/${id}/dismiss`, { method: 'POST' }),
  subscriptions: () => req<SearchSubscription[]>('/api/agent/subscriptions'),
  saveSubscription: (query: string) => req<SearchSubscription>('/api/agent/subscriptions', json('POST', { query, enabled: true })),
  runSubscription: (id: string) => req<{ summary: string; jobs: JobLead[] }>(`/api/agent/subscriptions/${id}/run`, { method: 'POST' }),
  runs: (limit?: number) => req<ResearchRun[]>(`/api/agent/runs${limit ? `?limit=${limit}` : ''}`),
  run: (id: string) => req<ResearchRun>(`/api/agent/runs/${id}`),
  review: (id: string) => req<ReviewReport>(`/api/applications/${id}/review`, { method: 'POST' }),
  generateInterviewQuestions: (id: string) => req<InterviewQuestion[]>(`/api/applications/${id}/interview/generate`, { method: 'POST' }),
  getInterviewQuestions: (id: string) => req<InterviewQuestion[]>(`/api/applications/${id}/interview/questions`),
  importResume: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return req<ParsedResume>('/api/import/resume', {
      method: 'POST',
      body: fd,
    })
  },
  confirmImport: (parsed: ParsedResume) => req<{ ok: boolean }>('/api/import/resume/confirm', json('POST', parsed)),
}

export interface ReviewItem {
  severity: 'critical' | 'medium' | 'low'
  category: 'missing_field' | 'weak_content' | 'keyword_gap' | 'suggestion'
  title: string
  description: string
  action: string
}

export interface ReviewReport {
  readiness_score: number
  summary: string
  items: ReviewItem[]
}

export interface InterviewQuestion {
  id: string
  type: 'behavioral' | 'technical' | 'situational'
  question: string
  context: string
  tips: string
}

export interface ParsedResume {
  profile: Profile
  entries: Entry[]
}
