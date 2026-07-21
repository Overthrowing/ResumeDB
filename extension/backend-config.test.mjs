import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('./backend-config.js', import.meta.url), 'utf8')

const loadConfig = (stored = {}) => {
  const chrome = {
    storage: {
      sync: {
        get: async (defaults) => ({ ...defaults, ...stored }),
      },
    },
  }
  return vm.runInNewContext(
    `${source}\n({ DEFAULT_BACKEND_URL, DEFAULT_WEB_APP_URL, getResumeDbSettings, getBackendCandidates })`,
    { chrome, URL },
  )
}

test('fresh installs use the hosted ResumeDB deployment', async () => {
  const config = loadConfig()

  assert.deepEqual(
    { ...(await config.getResumeDbSettings()) },
    {
      backendUrl: 'https://zealous-benevolence-production-617e.up.railway.app',
      webAppUrl: 'https://resumedb-ai.vercel.app',
    },
  )
})

test('backend discovery keeps local development fallbacks', async () => {
  const config = loadConfig()

  assert.deepEqual(Array.from(await config.getBackendCandidates()), [
    'https://zealous-benevolence-production-617e.up.railway.app',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ])
})

test('saved custom deployments remain supported', async () => {
  const config = loadConfig({
    backendUrl: 'https://api.example.com/path/',
    webAppUrl: 'https://app.example.com/settings/',
  })

  assert.deepEqual(
    { ...(await config.getResumeDbSettings()) },
    {
      backendUrl: 'https://api.example.com',
      webAppUrl: 'https://app.example.com',
    },
  )
})
