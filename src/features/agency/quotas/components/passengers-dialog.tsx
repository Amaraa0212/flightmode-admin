import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileDown, Loader2, Mail, Pencil, Printer, Search, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { agencyPortalService, type AgencyPassenger, type AgencyQuota, type EticketOptions } from '@/services'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EticketOptionsBar, useEticketOptions } from '@/features/agency/eticket-options'
import { EditPassengerDialog } from './edit-passenger-dialog'

/**
 * Reservation status code of a passenger: HK booked on TL-HOLD (no ticket yet), OK ticketed, WL waitlisted, XX cancelled.
 * A held booking shows no PNR until its tickets are issued.
 */
function statusCode(p: AgencyPassenger): 'HK' | 'OK' | 'WL' | 'XX' {
  if (p.status === 'cancelled' || p.booking_status === 'cancelled') return 'XX'
  if (p.status === 'waitlisted' || p.booking_status === 'waitlisted') return 'WL'
  if (p.booking_status === 'on_hold') return 'HK'
  return 'OK'
}

const CODE_CLASS = {
  HK: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  OK: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  WL: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  XX: 'text-muted-foreground',
}

/** checked in or later: the passenger can no longer be edited */
const AT_AIRPORT = ['checked_in', 'boarded', 'flown']

const ticketFile = (p: AgencyPassenger) => `eticket-${p.ticket_number ?? p.id}.pdf`

/** Open the e-ticket PDF in a hidden frame and print it */
async function printEticket(p: AgencyPassenger, options: EticketOptions) {
  const url = URL.createObjectURL(await agencyPortalService.eticketPdf(p.id, options))
  const frame = document.createElement('iframe')
  frame.style.display = 'none'
  frame.src = url
  frame.onload = () => {
    try {
      frame.contentWindow?.print()
    } catch {
      window.open(url, '_blank')
    }
    setTimeout(() => {
      frame.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }
  document.body.appendChild(frame)
}

/** Passengers the agency booked on one quota */
export function PassengersDialog({ quota, onClose }: { quota: AgencyQuota | null; onClose: () => void }) {
  const [eticket, setEticket] = useEticketOptions()
  const { data = [], isLoading } = useQuery({
    queryKey: ['agency-quota-passengers', quota?.id],
    queryFn: async () => (await agencyPortalService.passengers(quota!.id)).body,
    enabled: !!quota,
  })
  const queryClient = useQueryClient()
  const issue = useMutation({
    mutationFn: (bookingId: number) => agencyPortalService.issue(bookingId),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-quota-passengers', quota?.id] })
      queryClient.invalidateQueries({ queryKey: ['agency-accounts'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const ticketAction = useMutation({
    mutationFn: async ({ p, kind }: { p: AgencyPassenger; kind: 'pdf' | 'print' | 'email' }) => {
      if (kind === 'pdf') return agencyPortalService.downloadEticket(p.id, ticketFile(p), eticket)
      if (kind === 'print') return printEticket(p, eticket)
      const email = window.prompt('И-мэйл хаяг (хоосон бол зорчигчийн / захиалгын и-мэйл рүү илгээнэ)', '')
      if (email === null) return
      toast.success((await agencyPortalService.emailEticket(p.id, email.trim(), eticket)).message)
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const [editing, setEditing] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  // name, PNR, passport, ticket or phone
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((p) =>
      [p.name, p.infant, p.pnr, p.document_number, p.ticket_number, p.phone].some((v) => (v ?? '').toLowerCase().includes(q))
    )
  }, [data, query])

  return (
    <Dialog open={!!quota} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[85vh] flex-col sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>
            {quota?.flight_number} {quota?.route} — passengers
          </DialogTitle>
          <DialogDescription>
            {quota &&
              `${quota.used} зарагдсан${quota.held ? ` · ${quota.held} hold` : ''} · ${quota.remaining} үлдсэн / ${quota.seats || '∞'}`}
            {' · HK = TL-HOLD (тийз бичигдээгүй), OK = тийз бичигдсэн, WL = хүлээлгийн жагсаалт'}
            {query && ` · ${rows.length} found`}
          </DialogDescription>
        </DialogHeader>
        <EticketOptionsBar value={eticket} onChange={setEticket} />
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
                  <th className='pe-3'>Status</th>
                  <th className='text-end'>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const code = statusCode(p)
                  const ticketed = code === 'OK' && !!p.ticket_number
                  return (
                    <tr key={p.id} className='border-b last:border-0'>
                      <td className='text-brand py-1.5 pe-3 font-mono font-semibold'>
                        {code === 'HK' ? <span className='text-muted-foreground font-normal'>—</span> : p.pnr}
                      </td>
                      <td className='pe-3 font-medium'>
                        {p.name}
                        {p.infant && (
                          <span className='text-muted-foreground block text-[11px] font-normal'>+ INF {p.infant}</span>
                        )}
                      </td>
                      <td className='pe-3'>{p.type}</td>
                      <td className='pe-3 font-mono'>{p.document_number ?? '-'}</td>
                      <td className='pe-3 font-mono'>{p.ticket_number ?? '-'}</td>
                      <td className='pe-3 font-mono'>{p.phone ?? '-'}</td>
                      <td className='pe-3 text-xs'>
                        <div className='flex items-center gap-2'>
                          <span className={cn('rounded border px-1.5 font-mono font-bold', CODE_CLASS[code])}>{code}</span>
                          {code === 'HK' && p.ticketing_deadline_at && (
                            <span className='text-muted-foreground font-mono whitespace-nowrap'>
                              TL {p.ticketing_deadline_at.slice(0, 16).replace('T', ' ')}
                            </span>
                          )}
                          {code === 'OK' && AT_AIRPORT.includes(p.status) && (
                            <span className='text-muted-foreground'>{p.status.replace('_', ' ')}</span>
                          )}
                          {/* one button per PNR: on its first passenger */}
                          {code === 'HK' && rows.find((r) => r.booking_id === p.booking_id) === p && (
                            <Button
                              size='sm'
                              className='h-7 gap-1 text-xs'
                              disabled={issue.isPending}
                              onClick={() => issue.mutate(p.booking_id)}
                            >
                              <Ticket className='size-3.5' />
                              Тийз бичих
                            </Button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className='flex justify-end gap-0.5'>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7'
                            title='Засах'
                            disabled={code === 'XX' || AT_AIRPORT.includes(p.status)}
                            onClick={() => setEditing(p.id)}
                          >
                            <Pencil className='size-3.5' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7'
                            title={ticketed ? 'E-ticket PDF татах' : 'Тийз бичигдээгүй'}
                            disabled={!ticketed || ticketAction.isPending}
                            onClick={() => ticketAction.mutate({ p, kind: 'pdf' })}
                          >
                            <FileDown className='size-3.5' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7'
                            title={ticketed ? 'E-ticket хэвлэх' : 'Тийз бичигдээгүй'}
                            disabled={!ticketed || ticketAction.isPending}
                            onClick={() => ticketAction.mutate({ p, kind: 'print' })}
                          >
                            <Printer className='size-3.5' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7'
                            title={ticketed ? 'E-ticket и-мэйлээр илгээх' : 'Тийз бичигдээгүй'}
                            disabled={!ticketed || ticketAction.isPending}
                            onClick={() => ticketAction.mutate({ p, kind: 'email' })}
                          >
                            <Mail className='size-3.5' />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
      {editing !== null && quota && (
        <EditPassengerDialog passengerId={editing} quotaId={quota.id} onClose={() => setEditing(null)} />
      )}
    </Dialog>
  )
}
