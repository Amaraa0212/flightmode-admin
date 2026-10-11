import type {
  BaseResponse,
  ListParams,
  PaginationResponse,
} from '../types/shared/common.types'

/**
 * Mock helpers — API холболт хийгдээгүй үед service-үүд эдгээрийг ашиглана.
 * Бодит API холбох үед зөвхөн services/api/* доторх функцийн биеийг
 * client.get/post дуудлагаар солиход хангалттай.
 */

const MOCK_DELAY = 300

export function delay(ms: number = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ok<T>(body: T, message = 'OK'): Promise<BaseResponse<T>> {
  await delay()
  return { message, body }
}

export async function fail(message: string): Promise<never> {
  await delay()
  throw new Error(message)
}

function matchesQuery(row: unknown, query: string, keys: string[]) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return keys.some((key) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (acc, k) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[k]
            : undefined,
        row
      )
    return String(value ?? '')
      .toLowerCase()
      .includes(q)
  })
}

function matchesFilter(value: unknown, filter: unknown) {
  if (filter === undefined || filter === null || filter === '') return true
  if (Array.isArray(filter)) {
    return filter.length === 0 || filter.map(String).includes(String(value))
  }
  return String(value) === String(filter)
}

export interface MockListOptions<T> {
  /** Search хийх талбарууд (nested: 'agency.name') */
  searchKeys?: string[]
  /** params-аас шүүх талбарууд: { paramKey: (row) => value } */
  filters?: Record<string, (row: T) => unknown>
}

/**
 * In-memory list: search + filter + pagination
 */
export async function mockList<T>(
  rows: T[],
  params: ListParams = {},
  options: MockListOptions<T> = {}
): Promise<BaseResponse<PaginationResponse<T>>> {
  const { searchKeys = [], filters = {} } = options
  const current = params.current ?? 1
  const pageSize = params.pageSize ?? 20

  const filtered = rows.filter((row) => {
    if (params.query && !matchesQuery(row, params.query, searchKeys)) {
      return false
    }
    return Object.entries(filters).every(([key, getValue]) =>
      matchesFilter(getValue(row), params[key])
    )
  })

  const start = (current - 1) * pageSize
  return ok({
    total: filtered.length,
    items: filtered.slice(start, start + pageSize),
  })
}

let idSeq = 10_000
export function nextId() {
  idSeq += 1
  return idSeq
}

export function nowIso() {
  return new Date().toISOString()
}

export interface MockResourceOptions<T, TPayload> extends MockListOptions<T> {
  /** payload → row (existing байвал update) */
  build?: (payload: TPayload, existing?: T) => T
}

/**
 * Энгийн CRUD resource-ийн mock хэрэгжилт.
 * Бодит API: GET /x, GET /x/{id}, POST /x, PUT /x/{id}, DELETE /x/{id}
 */
export function createMockResource<
  T extends { id: number },
  TPayload = Partial<T>,
>(rows: T[], options: MockResourceOptions<T, TPayload> = {}) {
  const { build, ...listOptions } = options

  return {
    list: (params: ListParams = {}) => mockList(rows, params, listOptions),

    getById: async (id: number) => {
      const row = rows.find((r) => r.id === id)
      return row ? ok(row) : fail('Not found')
    },

    create: async (payload: TPayload) => {
      const row = build
        ? build(payload)
        : ({ ...(payload as object), id: nextId() } as T)
      rows.unshift(row)
      return ok(row, 'Created')
    },

    update: async (id: number, payload: TPayload) => {
      const index = rows.findIndex((r) => r.id === id)
      if (index < 0) return fail('Not found')
      const row = build
        ? build(payload, rows[index])
        : ({ ...rows[index], ...(payload as object) } as T)
      rows[index] = row
      return ok(row, 'Updated')
    },

    remove: async (id: number) => {
      const index = rows.findIndex((r) => r.id === id)
      if (index < 0) return fail('Not found')
      rows.splice(index, 1)
      return ok(null, 'Deleted')
    },
  }
}
