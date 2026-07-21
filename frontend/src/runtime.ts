const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${configuredApiBase}${normalizedPath}`
}

export const websocketUrl = (path: string): string => {
  const base = configuredApiBase || window.location.origin
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
