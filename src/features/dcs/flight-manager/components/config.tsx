import { flightOpsService, type FlightBoardRow } from '@/services'
import { FLIGHT_STATUS, FLIGHT_STATUS_OPTIONS } from '@/constants/status'
import {
  brand,
  chip,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<FlightBoardRow>,
  'search' | 'navigate'
> = {
  title: 'Flight Manager',
  description:
    'Operate flights — check-in, gate, ETD, departure times (OBT / TT / ET), delays and gate agents',
  queryKey: 'admin-flight-manager',
  list: flightOpsService.list,
  searchPlaceholder: 'Flight number, route or gate',
  filters: [
    { columnId: 'status', title: 'Status', options: FLIGHT_STATUS_OPTIONS },
  ],
  columns: [
    col<FlightBoardRow>('flight_number', 'Flight No', (r) =>
      brand(r.flight_number)
    ),
    col<FlightBoardRow>(
      'route',
      'Route',
      (r) => `${r.origin.iata_code} → ${r.destination.iata_code}`,
      { accessor: (r) => r.destination.iata_code }
    ),
    col<FlightBoardRow>('scheduled_departure_at', 'Date / STD', (r) =>
      dateTime(r.scheduled_departure_at)
    ),
    col<FlightBoardRow>(
      'etd',
      'ETD',
      (r) =>
        r.estimated_departure_at ? (
          <span className='text-amber-500'>
            {dateTime(r.estimated_departure_at, 'HH:mm')}
          </span>
        ) : (
          muted('-')
        ),
      { accessor: (r) => r.estimated_departure_at }
    ),
    col<FlightBoardRow>('gate', 'Gate', (r) => mono(r.gate ?? '-')),
    col<FlightBoardRow>(
      'pax',
      'CKI / PAX',
      (r) => mono(`${r.pax.checked_in} / ${r.pax.booked}`),
      { accessor: (r) => r.pax.checked_in }
    ),
    col<FlightBoardRow>(
      'agents',
      'Gate users',
      (r) => muted(r.ops.gate_agents.map((a) => a.name).join(', ') || '-'),
      { accessor: (r) => r.ops.gate_agents.length }
    ),
    col<FlightBoardRow>(
      'oci',
      'OCI',
      (r) => muted(r.ops.online_checkin_enabled ? 'On' : 'Off'),
      { accessor: (r) => r.ops.online_checkin_enabled }
    ),
    col<FlightBoardRow>(
      'obt',
      'OBT / TT',
      (r) =>
        mono(
          r.ops.off_block_at
            ? `${r.ops.off_block_at.slice(11, 16)} / ${r.ops.takeoff_at?.slice(11, 16) ?? '-'}`
            : '-'
        ),
      { accessor: (r) => r.ops.off_block_at }
    ),
    col<FlightBoardRow>('status', 'Status', (r) =>
      chip(r.status, FLIGHT_STATUS)
    ),
  ],
}
