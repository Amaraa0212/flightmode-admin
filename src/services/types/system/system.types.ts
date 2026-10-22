import type { ListParams } from '../shared/common.types'

export type ActivityChannel =
  'admin' | 'agency' | 'dcs' | 'gate' | 'online' | 'partner'

export interface ActivityLog extends Record<string, unknown> {
  id: number
  channel: ActivityChannel
  event: string
  description: string
  user: { id: number; name: string } | null
  subject_type: string
  subject_id: number
  flight_id: number | null
  flight?: { id: number; flight_number: string; scheduled_departure_at: string | null } | null
  passenger_id: number | null
  passenger?: { id: number; name: string; pnr: string | null } | null
  ip_address: string
  created_at: string
}

export interface ActivityLogListParams extends ListParams {
  channel?: string | string[]
  /** flight number prefix */
  flight?: string
  /** passenger name, PNR or document number */
  passenger?: string
  start_day?: string
  end_day?: string
}

export interface Announcement extends Record<string, unknown> {
  id: number
  title: string
  body: string
  audience: 'all' | 'agency' | 'airport'
  is_active: boolean
  published_at: string
  /** counters / agencies must confirm they read it */
  requires_acknowledgement?: boolean
}

export interface AnnouncementPayload {
  title: string
  body: string
  audience: 'all' | 'agency' | 'airport'
  is_active: boolean
  requires_acknowledgement?: boolean
}

export interface DashboardStats {
  flights_today: number
  passengers_today: number
  bookings_week: number
  revenue_week: number
  load_factor: number
  checkin_open: number
  daily: { date: string; bookings: number; passengers: number }[]
  top_routes: { route: string; passengers: number }[]
}

/** Legacy notification_required: messages agencies must acknowledge */
export interface RequiredNotification extends Record<string, unknown> {
  id: number
  title: string
  body: string
  airline: string
  agency: string | null
  is_required: boolean
  created_by: string
  created_at: string
}

export interface RequiredNotificationPayload {
  title: string
  body: string
  agency: string
  is_required: boolean
}

/** Legacy cabinbaggagerule (Terms & Condition) → baggage policies */
export interface PolicyDocument extends Record<string, unknown> {
  id: number
  title: string
  body: string
  type: 'cabin' | 'checked'
  locale: 'mn' | 'en'
  is_active: boolean
  created_at: string
}

export interface PolicyDocumentPayload {
  title: string
  body: string
  type: 'cabin' | 'checked'
  locale: 'mn' | 'en'
  is_active: boolean
}

export interface CarriageDocument {
  airline_id: number
  airline: string
  body: string
  updated_at: string
}

export type IssueReportStatus = 'open' | 'in_progress' | 'resolved' | 'rejected'

/** A problem a user sent from the "?" help panel of a page (/admin/issue-reports) */
export interface IssueReport extends Record<string, unknown> {
  id: number
  user: { id: number; name: string; email: string } | null
  airline: { id: number; name: string } | null
  agency: { id: number; name: string } | null
  page_path: string
  page_title: string | null
  message: string
  user_agent: string | null
  status: IssueReportStatus
  resolution_note: string | null
  resolved_by: { id: number; name: string } | null
  resolved_at: string | null
  created_at: string
}

export interface IssueReportListParams extends ListParams {
  status?: string | string[]
}
