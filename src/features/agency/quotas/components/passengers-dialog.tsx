import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { agencyPortalService, type AgencyQuota } from '@/services'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** Passengers the agency booked on one quota */
export function PassengersDialog({ quota, onClose }: { quota: AgencyQuota | null; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['agency-quota-passengers', quota?.id],
    queryFn: async () => (await agencyPortalService.passengers(quota!.id)).body,
    enabled: !!quota,
  })
  const [query, setQuery] = useState('')
  // name, PNR, passport, ticket or phone
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((p) =>
      [p.name, p.pnr, p.document_number, p.ticket_number, p.phone].some((v) => (v ?? '').toLowerCase().includes(q))
    )
  }, [data, query])

  return (
    <Dialog open={!!quota} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[85vh] flex-col sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {quota?.flight_number} {quota?.route} — passengers
          </DialogTitle>
          <DialogDescription>
            {quota && `${quota.used} sold of ${quota.seats} seats`}
            {query && ` · ${rows.length} found`}
          </DialogDescription>
        </DialogHeader>
        <div className='relative'>
          <Search className='text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Нэр, PNR, паспорт, тасалбар эсвэл утсаар хайх'
            className='h-9 ps-9'
            autoFocus
          />
        </div>
        <div className='min-h-0 flex-1 overflow-auto'>
          {isLoading ? (
            <div className='text-muted-foreground flex justify-center py-8'>
              <Loader2 className='size-5 animate-spin' />
            </div>
          ) : rows.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>
              {data.length ? `"${query}" — олдсонгүй.` : 'No passengers on this quota yet.'}
            </p>
          ) : (
            <table className='w-full text-sm'>
              <thead className='text-muted-foreground text-left text-xs'>
                <tr className='border-b'>
                  <th className='py-2 pe-3'>PNR</th>
                  <th className='pe-3'>Passenger</th>
                  <th className='pe-3'>Type</th>
                  <th className='pe-3'>Document</th>
                  <th className='pe-3'>Ticket</th>
                  <th className='pe-3'>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className='border-b last:border-0'>
                    <td className='text-brand py-1.5 pe-3 font-mono font-semibold'>{p.pnr}</td>
                    <td className='pe-3 font-medium'>{p.name}</td>
                    <td className='pe-3'>{p.type}</td>
                    <td className='pe-3 font-mono'>{p.document_number ?? '-'}</td>
                    <td className='pe-3 font-mono'>{p.ticket_number ?? '-'}</td>
                    <td className='pe-3 font-mono'>{p.phone ?? '-'}</td>
                    <td className='text-xs uppercase'>{p.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
