import { policyDocuments } from '../../mock/db'
import { createMockResource, fail, nextId, nowIso, ok } from '../../mock/utils'
import type { ListParams } from '../../types/shared/common.types'
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
      {
        ...pageQuery(rest),
        status: statuses.length === 1 ? statuses[0] : undefined,
        from,
        to,
      },
      (r) => r
    )
  },

  /** PATCH /admin/issue-reports/{id} — closing (resolved / rejected) stamps who and when */
  update: (
    id: number,
    payload: { status: IssueReportStatus; resolution_note: string }
  ) =>
    action(
      client.patch<ApiData<IssueReport>>(`/admin/issue-reports/${id}`, {
        status: payload.status,
        resolution_note: payload.resolution_note.trim() || null,
      }),
      (r) => r
    ),
}

// ─── Notifications / terms / carriage ───
type ApiNotice = {
  id: number
  airline?: { id: number; name: string } | null
  agency?: { id: number; name: string } | null
  airline_id: number
  agency_id: number | null
  title: string
  body: string
  requires_acknowledgement: boolean
  created_by?: string | null
  created_at: string
}

const toNotification = (a: ApiNotice): RequiredNotification => ({
  id: a.id,
  title: a.title,
  body: a.body,
  airline: a.airline?.name ?? '',
  agency: a.agency?.name ?? null,
  agency_id: a.agency_id,
  is_required: a.requires_acknowledgement,
  created_by: a.created_by ?? '',
  created_at: a.created_at,
})

const notificationBody = (p: RequiredNotificationPayload) => ({
  title: p.title,
  body: p.body,
  agency_id: p.agency_id ? Number(p.agency_id) : null,
  requires_acknowledgement: p.is_required,
  ...(p.airline_id ? { airline_id: Number(p.airline_id) } : {}),
})

/** Notifications page: what the airline sends to its staff and agencies */
export const requiredNotificationService = {
  list: (params: ListParams = {}) => {
    const { is_required, ...rest } = params
    return getPage<ApiNotice, RequiredNotification>(
      '/admin/announcements',
      pageQuery(rest, {
        requires_acknowledgement: Array.isArray(is_required)
          ? is_required.length === 1
            ? is_required[0]
            : undefined
          : (is_required as string | undefined),
      }),
      toNotification
    )
  },
  create: (payload: RequiredNotificationPayload) =>
    action(
      client.post<ApiData<ApiNotice>>(
        '/admin/announcements',
        notificationBody(payload)
      ),
      toNotification
    ),
  update: (id: number, payload: RequiredNotificationPayload) =>
    action(
      client.put<ApiData<ApiNotice>>(
        `/admin/announcements/${id}`,
        notificationBody(payload)
      ),
      toNotification
    ),
  remove: (id: number) =>
    action(
      client.delete<ApiData<null>>(`/admin/announcements/${id}`),
      () => null
    ),
}

export interface FeedAnnouncement {
  id: number
  airline: string | null
  title: string
  body: string
  requires_acknowledgement: boolean
  created_at: string
}

/** The navbar bell: announcements addressed to the signed-in user */
export const announcementFeedService = {
  list: async () =>
    ok(
      (await client.get<ApiData<ApiNotice[]>>('/announcements')).data.map(
        (a): FeedAnnouncement => ({
          id: a.id,
          airline: a.airline?.name ?? null,
          title: a.title,
          body: a.body,
          requires_acknowledgement: a.requires_acknowledgement,
          created_at: a.created_at,
        })
      )
    ),
  dismiss: async (id: number) => {
    const res = await client.post<{ message: string }>(
      `/announcements/${id}/dismiss`
    )
    return ok(null, res.message)
  },
}

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
