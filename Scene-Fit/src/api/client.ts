const SESSION_KEY = 'scene-fit-session-id'

function resolveApiBaseUrl(raw: string | undefined) {
  const value = (raw ?? '/v1').replace(/\/$/, '')
  if (value === '/v1' || value.endsWith('/v1')) return value
  return `${value}/v1`
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export function isMockMode() {
  return import.meta.env.VITE_API_MOCK === 'true'
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type Envelope<T> = {
  data?: T
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export function getSessionId() {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function setSessionId(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSessionId() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function rememberSession(res: Response, body: Envelope<unknown> | null) {
  const headerId = res.headers.get('X-Session-Id')
  if (headerId) {
    setSessionId(headerId)
    return
  }
  const data = body?.data
  if (data && typeof data === 'object' && data !== null && 'sessionId' in data) {
    const sessionId = (data as { sessionId?: unknown }).sessionId
    if (typeof sessionId === 'string' && sessionId) setSessionId(sessionId)
  }
}

async function parseBody(res: Response): Promise<Envelope<unknown> | null> {
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as Envelope<unknown>
  } catch {
    return null
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const sessionId = getSessionId()
  if (sessionId) headers.set('X-Session-Id', sessionId)

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했습니다.')
  }

  const body = await parseBody(res)
  rememberSession(res, body)

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? '요청에 실패했습니다.',
      body?.error?.details,
    )
  }

  if (res.status === 204) return undefined as T
  return (body?.data as T) ?? (undefined as T)
}

export function apiJson<T>(path: string, method: string, body?: unknown) {
  return apiRequest<T>(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== 'all') search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
