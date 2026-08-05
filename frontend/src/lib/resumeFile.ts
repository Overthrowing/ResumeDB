import type { AppMeta } from '@/lib/api'

/** Download name for a rendered resume. Company alone is not enough: apply to
 * two teams at one company and you get two files called resume-google.pdf.
 * Mirrors pdf_name() in routes.py, which names the entries in the bulk zip. */
export function resumeFilename(meta: Pick<AppMeta, 'company' | 'role' | 'id'>): string {
  const stem = [meta.company, meta.role].map((s) => (s ?? '').trim()).filter(Boolean).join(' - ')
  return `Resume - ${stem || meta.id}`.replace(/[/\\:*?"<>|]/g, '-').slice(0, 150) + '.pdf'
}
