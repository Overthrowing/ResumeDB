import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { api, type AgentProvider } from '@/lib/api'
import EnvStep from '@/routes/onboarding/EnvStep'
import ImportStep from '@/routes/onboarding/ImportStep'
import ProviderStep from '@/routes/onboarding/ProviderStep'
import RepoStep from '@/routes/onboarding/RepoStep'
import { cn } from '@/lib/utils'

type Step = 'env' | 'provider' | 'repo' | 'import'
const STEPS: { id: Step; label: string }[] = [
  { id: 'env', label: 'Environment' },
  { id: 'provider', label: 'Provider' },
  { id: 'repo', label: 'Data folder' },
  { id: 'import', label: 'Import' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('env')
  const [provider, setProvider] = useState<AgentProvider | null>(null)
  const [path, setPath] = useState('')

  const envQ = useQuery({ queryKey: ['env'], queryFn: api.env, staleTime: 10_000 })
  const env = envQ.data

  // Seed the data-folder field from the server default once, when it arrives.
  // The input binds straight to `path` so it stays clearable - rendering
  // `path || defaultPath` made deleting the last character snap back.
  const defaultPath = env?.data_repo ?? ''
  useEffect(() => {
    if (defaultPath) setPath((p) => p || defaultPath)
  }, [defaultPath])

  const finish = async () => {
    await qc.invalidateQueries({ queryKey: ['health'] })
    navigate('/library', { replace: true })
  }

  const stepIdx = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="flex h-screen flex-col items-center overflow-y-auto bg-background px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-2 text-center font-heading text-[34px] font-semibold tracking-tight">ResumeDB</div>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          A career database that tailors itself. Four quick steps.
        </p>

        {/* stepper */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                  i === stepIdx
                    ? 'bg-primary text-primary-foreground'
                    : i < stepIdx
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {i < stepIdx && <Check className="size-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          ))}
        </div>

        {step === 'env' && (
          <EnvStep
            env={env}
            loading={envQ.isFetching}
            onRefresh={() => envQ.refetch()}
            onNext={() => setStep('provider')}
          />
        )}
        {step === 'provider' && (
          <ProviderStep
            env={env}
            provider={provider}
            onPick={setProvider}
            onNext={async (p) => {
              try {
                await api.saveConfig({ agent_provider: p })
                setStep('repo')
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
          />
        )}
        {step === 'repo' && <RepoStep path={path} setPath={setPath} onDone={() => setStep('import')} />}
        {step === 'import' && <ImportStep onFinish={finish} />}
      </div>
    </div>
  )
}
