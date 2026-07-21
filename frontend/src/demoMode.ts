import type { AppMeta, Entry, Profile } from './api'

export function isDemoApplication(application: AppMeta): boolean {
  return application.source?.includes('demo=ats') === true
}

export function isDemoEntry(entry: Pick<Entry, 'id'>): boolean {
  return entry.id.startsWith('hackathon-demo-')
}

export function isDemoProfile(profile: Profile): boolean {
  return profile.demo_mode === true
    || profile.email?.endsWith('@example.net') === true
    || profile.links?.some((link) => link.url.includes('resumedb-demo-')) === true
}
