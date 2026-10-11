import { agencyService, type Agency } from '@/services'
import { brand, col, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<Agency>,
  'search' | 'navigate'
> = {
  title: 'Agents permission',
  description:
    'Which agencies may sell each airline (contract active / suspended)',
  queryKey: 'admin-agency-access',
  list: agencyService.list,
  searchPlaceholder: 'Agency name or code',
  columns: [
    col<Agency>('code', 'Code', (r) => brand(r.code)),
    col<Agency>('name', 'Agency', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<Agency>('email', 'Email', (r) => muted(r.email)),
  ],
}
