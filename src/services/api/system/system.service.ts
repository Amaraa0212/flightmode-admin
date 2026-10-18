import {
  carriageDocuments,
  policyDocuments,
  requiredNotifications,
} from '../../mock/db'
import { createMockResource, fail, nextId, nowIso, ok } from '../../mock/utils'
import type {
  ActivityLog,
  ActivityLogListParams,
  Announcement,
  AnnouncementPayload,
  DashboardStats,
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

// TODO(api): airlines.conditions_of_carriage (PUT /admin/airlines/{id})
export const carriageService = {
  list: () => ok(carriageDocuments),
  save: (airlineId: number, body: string) => {
    const doc = carriageDocuments.find((d) => d.airline_id === airlineId)
    if (!doc) return fail('Airline not found')
    doc.body = body
    doc.updated_at = nowIso()
    return ok(doc, 'Conditions of carriage saved')
  },
}
