import { policyDocuments, requiredNotifications } from '../../mock/db'
import { createMockResource, fail, nextId, nowIso, ok } from '../../mock/utils'
import type {
  ActivityLog,
  ActivityLogListParams,
  Announcement,
  AnnouncementPayload,
  CarriageDocument,
  DashboardStats,
  IssueReport,
  IssueReportListParams,
  IssueReportStatus,
  PolicyDocument,
  PolicyDocumentPayload,
  RequiredNotification,
  RequiredNotificationPayload,
} from '../../types/system/system.types'
import {
  action,
  client,
  getPage,
  pageQuery,
  period,
  type ApiAction,
  type ApiData,
} from '../shared/client'

/** /admin/activity-logs — limited by the API to the user's flights and staff */
export const activityLogService = {
  list: (params: ActivityLogListParams = {}) => {
    const { channel, start_day: _s, end_day: _e, ...rest } = params
    const { from, to } = period(params)
    return getPage<ActivityLog, ActivityLog>(
      '/admin/activity-logs',
      {
        // query → search (event, description, user, IP); flight / passenger come from the URL as they are
        ...pageQuery(rest),
        channel: Array.isArray(channel) ? channel[0] : channel,
        from,
        to,
      },
      (l) => l
    )
  },
}

type ApiAnnouncement = {
  id: number
  title: string
  body: string
  agency_id: number | null
  requires_acknowledgement: boolean
  created_at: string
}

const toAnnouncement = (a: ApiAnnouncement): Announcement => ({
  id: a.id,
  title: a.title,
  body: a.body,
  audience: a.agency_id ? 'agency' : 'all',
  is_active: true,
  published_at: a.created_at,
  requires_acknowledgement: a.requires_acknowledgement,
})

const announcementBody = (p: AnnouncementPayload) => ({
  title: p.title,
  body: p.body,
  requires_acknowledgement: !!p.requires_acknowledgement,
})

/** /admin/announcements — for the user's airline (counters and agencies read them) */
export const announcementService = {
  list: (params: ActivityLogListParams = {}) =>
    getPage<ApiAnnouncement, Announcement>(
      '/admin/announcements',
      pageQuery(params),
      toAnnouncement
    ),
  getById: async (id: number) => {
    const res = await announcementService.list({ pageSize: 200 })
    const row = res.body.items.find((a) => a.id === id)
    return row ? { message: 'OK', body: row } : fail('Not found')
  },
  create: (payload: AnnouncementPayload) =>
    action(
      client.post<ApiData<ApiAnnouncement>>(
        '/admin/announcements',
        announcementBody(payload)
      ),
      toAnnouncement
    ),
  update: (id: number, payload: AnnouncementPayload) =>
    action(
      client.put<ApiData<ApiAnnouncement>>(
        `/admin/announcements/${id}`,
        announcementBody(payload)
      ),
      toAnnouncement
    ),
  remove: (id: number) =>
    action(
      client.delete<ApiData<null>>(`/admin/announcements/${id}`),
      () => null
    ),
}

/** /admin/dashboard — summary block (cards, 14-day chart, top routes) */
export const dashboardService = {
  get: async () => {
    const res =
      await client.get<ApiData<{ summary: DashboardStats }>>('/admin/dashboard')
    return ok(res.data.summary)
  },
}

/** POST /issue-reports — a problem reported from the page help panel (stored in issue_reports) */
export const issueReportService = {
  send: (payload: {
    page_path: string
    page_title?: string
    message: string
  }) =>
    action(
      client.post<ApiAction<{ id: number }>>('/issue-reports', payload),
      (r) => r
    ),

  /** GET /admin/issue-reports — newest first; search, status and date range on the API */
  list: (params: IssueReportListParams = {}) => {
    const { status, start_day: _s, end_day: _e, ...rest } = params
    const { from, to } = period(params)
    const statuses = ([] as string[]).concat(status ?? [])
    return getPage<IssueReport, IssueReport>(
      '/admin/issue-reports',
      { ...pageQuery(rest), status: statuses.length === 1 ? statuses[0] : undefined, from, to },
      (r) => r
    )
  },

  /** PATCH /admin/issue-reports/{id} — closing (resolved / rejected) stamps who and when */
  update: (id: number, payload: { status: IssueReportStatus; resolution_note: string }) =>
    action(
      client.patch<ApiData<IssueReport>>(`/admin/issue-reports/${id}`, {
        status: payload.status,
        resolution_note: payload.resolution_note.trim() || null,
      }),
      (r) => r
    ),
}

// ─── Notifications / terms / carriage ───
// TODO(api): notifications table is not in flightmode-api yet (legacy notification_required)
export const requiredNotificationService = createMockResource<
  RequiredNotification,
  RequiredNotificationPayload
>(requiredNotifications, {
  searchKeys: ['title', 'body', 'agency'],
  filters: { is_required: (row) => String(row.is_required) },
  build: (payload, existing) => ({
    airline: 'MIAT Mongolian Airlines',
    created_by: 'System Admin',
    created_at: nowIso(),
    ...existing,
    ...payload,
    agency: payload.agency || null,
    id: existing?.id ?? nextId(),
  }),
})

// TODO(api): /admin/baggage-policies
export const policyDocumentService = createMockResource<
  PolicyDocument,
  PolicyDocumentPayload
>(policyDocuments, {
  searchKeys: ['title', 'body'],
  filters: { type: (row) => row.type, locale: (row) => row.locale },
  build: (payload, existing) => ({
    created_at: nowIso(),
    ...existing,
    ...payload,
    id: existing?.id ?? nextId(),
  }),
})

type ApiCarriageAirline = {
  id: number
  name: string
  conditions_of_carriage: string | null
  updated_at: string | null
}

const toCarriage = (a: ApiCarriageAirline): CarriageDocument => ({
  airline_id: a.id,
  airline: a.name,
  body: a.conditions_of_carriage ?? '',
  updated_at: a.updated_at ?? '',
})

/** airlines.conditions_of_carriage — an airline user sees and edits only their own airline */
export const carriageService = {
  list: async () => {
    const res = await client.get<ApiData<ApiCarriageAirline[]>>(
      '/admin/airlines',
      { per_page: 100 }
    )
    return ok(res.data.map(toCarriage))
  },
  save: (airlineId: number, body: string) =>
    action(
      client.put<ApiData<ApiCarriageAirline>>(`/admin/airlines/${airlineId}`, {
        conditions_of_carriage: body,
      }),
      toCarriage
    ),
}
