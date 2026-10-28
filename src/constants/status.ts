export type Tone = 'cyan' | 'green' | 'amber' | 'red' | 'indigo' | 'slate'

export type StatusMeta = { label: string; tone: Tone }

function toOptions(map: Record<string, StatusMeta>) {
  return Object.entries(map).map(([value, meta]) => ({
    label: meta.label,
    value,
  }))
}

export const FLIGHT_STATUS: Record<string, StatusMeta> = {
  scheduled: { label: 'Scheduled', tone: 'slate' },
  checkin_open: { label: 'Check-in open', tone: 'amber' },
  checkin_closed: { label: 'Check-in closed', tone: 'indigo' },
  gate_closed: { label: 'Gate closed', tone: 'green' },
  departed: { label: 'Departed', tone: 'cyan' },
  cancelled: { label: 'Cancelled', tone: 'red' },
}

export const BOOKING_STATUS: Record<string, StatusMeta> = {
  confirmed: { label: 'Confirmed', tone: 'green' },
  on_hold: { label: 'On hold (TL)', tone: 'indigo' },
  waitlisted: { label: 'Waitlisted', tone: 'amber' },
  cancelled: { label: 'Cancelled', tone: 'red' },
}

export const SEGMENT_STATUS: Record<string, StatusMeta> = {
  booked: { label: 'Booked', tone: 'slate' },
  waitlisted: { label: 'Waitlisted', tone: 'amber' },
  checked_in: { label: 'Checked in', tone: 'green' },
  boarded: { label: 'Boarded', tone: 'cyan' },
  flown: { label: 'Flown', tone: 'indigo' },
  cancelled: { label: 'Cancelled', tone: 'red' },
}

export const BOOKING_SOURCE: Record<string, StatusMeta> = {
  admin: { label: 'Admin', tone: 'indigo' },
  counter: { label: 'Counter', tone: 'cyan' },
  agency: { label: 'Agency', tone: 'slate' },
  agency_api: { label: 'Agency API', tone: 'slate' },
  import: { label: 'Import', tone: 'slate' },
}

export const CHARTER_STATUS: Record<string, StatusMeta> = {
  requested: { label: 'Requested', tone: 'slate' },
  pending: { label: 'Pending', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
}

export const ROLE_SCOPE: Record<string, StatusMeta> = {
  admin: { label: 'System', tone: 'indigo' },
  airline: { label: 'Airline', tone: 'cyan' },
  agency: { label: 'Agency', tone: 'slate' },
  airport: { label: 'Airport', tone: 'amber' },
}

export const ACTIVITY_CHANNEL: Record<string, StatusMeta> = {
  admin: { label: 'Admin', tone: 'indigo' },
  agency: { label: 'Agency', tone: 'slate' },
  auth: { label: 'Sign-in', tone: 'amber' },
  dcs: { label: 'DCS', tone: 'green' },
  gate: { label: 'Gate', tone: 'amber' },
  online: { label: 'Online', tone: 'cyan' },
  partner: { label: 'Partner', tone: 'slate' },
}

export const CABIN_CLASS: Record<string, StatusMeta> = {
  F: { label: 'First', tone: 'indigo' },
  C: { label: 'Business', tone: 'amber' },
  W: { label: 'Premium', tone: 'cyan' },
  Y: { label: 'Economy', tone: 'slate' },
}

export const BAGGAGE_USAGE: Record<string, StatusMeta> = {
  free: { label: 'Free allowance', tone: 'green' },
  prepaid: { label: 'Prepaid (XBAG)', tone: 'cyan' },
  excess: { label: 'Excess (EBAG)', tone: 'amber' },
}

/** How a baggage rule limits bags (API `type`) */
export const BAGGAGE_RULE_TYPE: Record<string, StatusMeta> = {
  piece: { label: 'By piece', tone: 'cyan' },
  weight: { label: 'By kg (all excess)', tone: 'amber' },
  combined: { label: 'Piece + kg', tone: 'green' },
}

export const ACTIVE: Record<string, StatusMeta> = {
  true: { label: 'Active', tone: 'green' },
  false: { label: 'Inactive', tone: 'slate' },
}

export const FLIGHT_STATUS_OPTIONS = toOptions(FLIGHT_STATUS)

/** Issue reports from the "?" help panel */
export const ISSUE_STATUS: Record<string, StatusMeta> = {
  open: { label: 'Open', tone: 'amber' },
  in_progress: { label: 'In progress', tone: 'cyan' },
  resolved: { label: 'Resolved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'slate' },
}
export const ISSUE_STATUS_OPTIONS = toOptions(ISSUE_STATUS)

/** Хуваарьт (scheduled, sold by fare) / захиалгат (charter: bags are free at the counter) */
export const SERVICE_TYPE: Record<string, StatusMeta> = {
  scheduled: { label: 'Scheduled', tone: 'cyan' },
  charter: { label: 'Charter', tone: 'amber' },
}
export const SERVICE_TYPE_OPTIONS = toOptions(SERVICE_TYPE)
export const BOOKING_STATUS_OPTIONS = toOptions(BOOKING_STATUS)
export const BOOKING_SOURCE_OPTIONS = toOptions(BOOKING_SOURCE)
export const CHARTER_STATUS_OPTIONS = toOptions(CHARTER_STATUS)
export const ROLE_SCOPE_OPTIONS = toOptions(ROLE_SCOPE)
export const ACTIVITY_CHANNEL_OPTIONS = toOptions(ACTIVITY_CHANNEL)
export const CABIN_CLASS_OPTIONS = toOptions(CABIN_CLASS)
export const BAGGAGE_RULE_TYPE_OPTIONS = toOptions(BAGGAGE_RULE_TYPE)
export const BAGGAGE_USAGE_OPTIONS = toOptions(BAGGAGE_USAGE)
export const ACTIVE_OPTIONS = toOptions(ACTIVE)
