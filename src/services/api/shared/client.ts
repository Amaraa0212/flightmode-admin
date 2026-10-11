import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/config/api'
import type {
  ListParams,
  PaginationResponse,
} from '../../types/shared/common.types'

/*
| flightmode-api client (Sanctum Bearer token). fetch-based — no extra dependency.
| Laravel shapes: resource → { data }, paginator → { data, meta: { total } }, action → { message, data }.
*/

/** flightmode-api business / validation error (HTTP 422 гэх мэт) */
/** Development: the local API is not running · production: the server is down or unreachable */
const UNREACHABLE = import.meta.env.DEV
  ? 'Cannot reach flightmode-api. Start it with `php artisan serve` (port 8000).'
  : `Cannot reach the server (${api.base}). Check the connection and try again.`

export class ApiError extends Error {
  status: number
  code?: string
  errors?: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    code?: string,
    errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

type Query = Record<string, unknown>

function queryString(query?: Query) {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, String(v)))
    else params.append(key, String(value))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

async function request<T>(
  method: string,
  path: string,
  options: { query?: Query; body?: unknown; blob?: boolean } = {}
): Promise<T> {
  const token = useAuthStore.getState().auth.token
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${api.base}${path}${queryString(options.query)}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(
      UNREACHABLE,
      0
    )
  }

  if (response.ok) {
    if (options.blob) return (await response.blob()) as T
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  }

  const body = (await response.json().catch(() => null)) as {
    message?: string
    code?: string
    errors?: Record<string, string[]>
  } | null

  if (response.status === 401 && !path.startsWith('/auth/login')) {
    useAuthStore.getState().auth.reset()
    if (!window.location.pathname.startsWith('/sign-in')) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.replace(`/sign-in?redirect=${redirect}`)
    }
  }

  const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
  const message =
    firstFieldError ??
    body?.message ??
    (response.status >= 500 && !body
      ? UNREACHABLE
      : response.status === 403
        ? 'You do not have permission for this.'
        : response.statusText)
  throw new ApiError(message, response.status, body?.code, body?.errors)
}

export const client = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body: body ?? {} }),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, { body }),
  blob: (path: string, query?: Query) => request<Blob>('GET', path, { query, blob: true }),
}

export type ApiData<T> = { data: T }
export type ApiAction<T> = { message: string; data: T }
export type ApiPage<T> = { data: T[]; meta?: { total: number } }

/** Service response shape the screens already use ({ message, body }) */
export const ok = <T>(body: T, message = 'OK') => ({ message, body })

/** Table params (current / pageSize / query) → Laravel paginator (page / per_page) */
export function pageQuery(params: ListParams = {}, extra: Query = {}): Query {
  const { current, pageSize, query, ...rest } = params
  return { ...rest, ...extra, page: current ?? 1, per_page: pageSize ?? 20, search: query }
}

/** GET a Laravel paginator (or a plain collection) as { total, items } */
export async function getPage<A, T>(
  path: string,
  query: Query,
  map: (row: A) => T
): Promise<{ message: string; body: PaginationResponse<T> }> {
  const res = await client.get<ApiPage<A>>(path, query)
  const items = res.data.map(map)
  return ok({ total: res.meta?.total ?? items.length, items })
}

/** A write that returns { message, data } */
export async function action<A, T>(
  promise: Promise<ApiAction<A> | ApiData<A>>,
  map: (row: A) => T
) {
  const res = await promise
  return ok(map(res.data), 'message' in res ? res.message : 'Saved')
}

/** Browser download of a file response */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
