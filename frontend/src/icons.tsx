// Inline Lucide-style icons from the Resume Studio design.
const I = ({ d, size = 17, sw = 1.5 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
    {d.split('|').map((p, i) =>
      p.startsWith('c:') ? (
        <circle key={i} cx={p.split(',')[1]} cy={p.split(',')[2]} r={p.split(',')[3]} />
      ) : (
        <path key={i} d={p} />
      ),
    )}
  </svg>
)

export const IconLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="ResumeDB">
    <rect x="16" y="16" width="480" height="480" rx="116" fill="#201f1d" />
    <path fill="#f8f4f4" d="M128 72h168l88 88v280H128c-22 0-40-18-40-40V112c0-22 18-40 40-40Z" />
    <path fill="#d6a252" d="M296 72v64c0 13 11 24 24 24h64l-88-88Z" />
    <path fill="#615d57" d="M144 198h144v25H144zm0 58h176v25H144zm0 58h124v25H144z" />
    <path fill="#b68235" stroke="#201f1d" strokeWidth="14" strokeLinejoin="round" d="m363 267 18 52 52 18-52 18-18 52-18-52-52-18 52-18 18-52Z" />
  </svg>
)
export const IconUser = (p: { size?: number }) => <I {...p} d="c:,12,8,4|M4 21c0-4 4-6 8-6s8 2 8 6" />
export const IconBriefcase = (p: { size?: number }) => (
  <I {...p} d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2|M3 8.5h18v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
)
export const IconTemplate = (p: { size?: number }) => <I {...p} d="M4 3h16v18H4z|M8 8h8M8 12h8M8 16h5" />
export const IconSettings = (p: { size?: number }) => (
  <I {...p} d="c:,12,12,3|M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
)
export const IconMemory = (p: { size?: number }) => (
  <I {...p} d="M12 3a4 4 0 0 0-4 4v1a3 3 0 0 0 0 6 4 4 0 0 0 8 0 3 3 0 0 0 0-6V7a4 4 0 0 0-4-4Z" />
)
export const IconPlus = (p: { size?: number; sw?: number }) => <I sw={1.6} {...p} d="M12 5v14M5 12h14" />
export const IconCheck = (p: { size?: number; sw?: number }) => <I sw={1.6} {...p} d="M20 6 9 17l-5-5" />
export const IconX = (p: { size?: number; sw?: number }) => <I sw={2} {...p} d="M18 6 6 18M6 6l12 12" />
export const IconChevronDown = (p: { size?: number }) => <I {...p} d="m6 9 6 6 6-6" />
export const IconChevronLeft = (p: { size?: number; sw?: number }) => <I sw={1.6} {...p} d="m15 18-6-6 6-6" />
export const IconSend = (p: { size?: number; sw?: number }) => <I sw={1.6} {...p} d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
export const IconChat = (p: { size?: number }) => (
  <I {...p} d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
)
export const IconWarn = (p: { size?: number; sw?: number }) => (
  <I sw={1.6} {...p} d="M12 9v4M12 17h.01|M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
)
export const IconRefresh = (p: { size?: number }) => <I {...p} d="M21 12a9 9 0 1 1-3-6.7L21 8|M21 3v5h-5" />
export const IconDownload = (p: { size?: number }) => <I {...p} d="M12 3v12M7 10l5 5 5-5M5 21h14" />
export const IconSparkle = (p: { size?: number }) => (
  <I {...p} d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
)
export const IconHistory = (p: { size?: number }) => (
  <I {...p} d="M3 3v5h5|M3.05 13a9 9 0 1 0 2.13-5.36L3 8|M12 7v5l4 2" />
)
