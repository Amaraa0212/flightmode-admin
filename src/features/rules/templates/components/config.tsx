import { serviceTemplateService, type ServiceTemplate } from '@/services'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const minutesLabel = (m: number) =>
  m ? (m >= 60 ? `${m / 60} h` : `${m} min`) : '—'

export const pageConfig: Omit<
  ResourcePageProps<ServiceTemplate>,
  'search' | 'navigate'
> = {
  title: 'Template',
  description:
    'Bundles of baggage rules, paid seats and online check-in window applied to flights',
  queryKey: 'admin-templates',
  list: serviceTemplateService.list,
  searchPlaceholder: 'Template name',
  columns: [
    col<ServiceTemplate>('name', 'Name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<ServiceTemplate>(
      'baggage_rule_ids',
      'Bag ids',
      (r) => brand(r.baggage_rule_ids.join(', ') || '-'),
      { accessor: (r) => r.baggage_rule_ids.join(',') }
    ),
    col<ServiceTemplate>(
      'seat_price_ids',
      'Seat ids',
      (r) => brand(r.seat_price_ids.join(', ') || '-'),
      { accessor: (r) => r.seat_price_ids.join(',') }
    ),
    col<ServiceTemplate>('oci_opens_minutes', 'OCI start', (r) =>
      mono(minutesLabel(r.oci_opens_minutes))
    ),
    col<ServiceTemplate>('oci_closes_minutes', 'OCI close', (r) =>
      mono(minutesLabel(r.oci_closes_minutes))
    ),
    col<ServiceTemplate>('seat_assignment_profile', 'Seat profile', (r) =>
      muted(r.seat_assignment_profile ?? '-')
    ),
    col<ServiceTemplate>('airline', 'Airline', (r) => muted(r.airline)),
  ],
  remove: {
    run: (r) => serviceTemplateService.remove(r.id),
    label: (r) => r.name,
  },
}
