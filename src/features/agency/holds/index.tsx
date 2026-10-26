import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  agencyHoldService,
  type AgencyHold,
  type AgencyQuota,
} from '@/services'
import { Search, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { BalanceStrip } from '@/features/agency/account/balance-strip'
import { BookingDialog } from '@/features/agency/quotas/components/booking-dialog'
import {
  formatDateTime,
  formatMoney,
} from '@/features/agency/transactions/transactions-table'
import { EmptyRow, Panel } from '@/features/fare-settings/shared'

const route = getRouteApi('/_authenticated/agency/holds/')

/** The hold as the name-entry dialog expects its quota */
const toQuota = (h: AgencyHold): AgencyQuota => ({
  id: h.allocation_id,
  airline: '',
  flight_number: h.flight_number,
  route: h.route,
  departure_at: h.departure_local ?? '',
  return_flight: h.return_flight,
  seats: h.seats,
  used: h.usage.named,
  remaining: h.usage.remaining,
  cabins: `${h.cabin_class} ${h.seats}`,
  cabin_classes: [h.cabin_class],
  names_deadline_at: h.names_deadline_at,
  is_open_for_names: h.usage.is_open_for_names,
})

/** Agency portal: held seats, enter the passengers' names on them or release them */
export function AgencyHolds() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const status = search.status ?? 'active'
  const queryClient = useQueryClient()
  const [naming, setNaming] = useState<AgencyHold | null>(null)
  const [releasing, setReleasing] = useState<AgencyHold | null>(null)

  const query = useQuery({
    queryKey: ['agency-holds', status],
    queryFn: async () => (await agencyHoldService.list(status)).body,
  })
  const holds = query.data ?? []

  const release = useMutation({
    mutationFn: (id: number) => agencyHoldService.release(id),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-holds'] })
      queryClient.invalidateQueries({ queryKey: ['agency-flights'] })
      queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
      setReleasing(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Hold-ууд'
        description='Hold хийсэн суудлууд. Мөрөөс “Нэр оруулах” дарж зорчигчдыг оруулахад тийз бичигдэж, үнэ нь данснаас хасагдана.'
        actions={
          <Button asChild size='sm' className='h-8 gap-2'>
            <Link to='/agency/search'>
              <Search className='size-4' />
              Нислэг хайх
            </Link>
          </Button>
        }
      />

      <BalanceStrip />

      <Panel
        title={status === 'active' ? 'Идэвхтэй hold' : 'Бүх hold'}
        subtitle={`${holds.length} hold`}
        actions={
          <div className='flex gap-1.5'>
            {(['active', 'all'] as const).map((s) => (
              <Button
                key={s}
                size='sm'
                variant={status === s ? 'default' : 'outline'}
                className='h-7 text-xs'
                onClick={() => navigate({ search: { status: s } })}
              >
                {s === 'active' ? 'Идэвхтэй' : 'Бүгд'}
              </Button>
            ))}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Нислэг</TableHead>
              <TableHead>Cabin / тариф</TableHead>
              <TableHead className='text-end'>Нэгж үнэ</TableHead>
              <TableHead className='text-end'>Нэртэй / hold</TableHead>
              <TableHead>Нэр оруулах хугацаа</TableHead>
              <TableHead className='text-end'>Үйлдэл</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holds.map((h) => {
              const open = h.status === 'active' && h.usage.is_open_for_names
              return (
                <TableRow
                  key={h.id}
                  className={cn(h.status !== 'active' && 'opacity-60')}
                >
                  <TableCell>
                    <p className='font-mono font-semibold'>
                      {h.flight_number}{' '}
                      <span className='text-muted-foreground font-normal'>
                        {h.route}
                      </span>
                    </p>
                    <p className='text-muted-foreground font-mono text-xs'>
                      {h.departure_local}
                    </p>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {h.cabin_class}
                    {h.fare?.fare_class && ` · ${h.fare.fare_class}`}
                  </TableCell>
                  <TableCell className='text-end font-mono text-xs'>
                    {h.fare
                      ? formatMoney(
                          Number(h.fare.price.fare) + Number(h.fare.price.tax)
                        )
                      : '-'}
                  </TableCell>
                  <TableCell className='text-end font-mono'>
                    <b>{h.usage.named}</b> / {h.seats}
                    {open && h.usage.remaining > 0 && (
                      <p className='text-xs text-emerald-600 dark:text-emerald-400'>
                        {h.usage.remaining} нэргүй
                      </p>
                    )}
                    {h.status !== 'active' && (
                      <p className='text-muted-foreground text-xs'>
                        цуцлагдсан
                      </p>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'font-mono text-xs',
                      !h.usage.is_open_for_names &&
                        h.status === 'active' &&
                        'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatDateTime(h.names_deadline_at)}
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-1'>
                      <Button
                        size='sm'
                        className='h-7 gap-1 text-xs'
                        disabled={!open || h.usage.remaining < 1}
                        onClick={() => setNaming(h)}
                      >
                        <UserPlus className='size-3.5' />
                        Нэр оруулах
                      </Button>
                      {h.status === 'active' && (
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-7 gap-1 text-xs text-red-600 dark:text-red-400'
                          onClick={() => setReleasing(h)}
                        >
                          <X className='size-3.5' />
                          Цуцлах
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {!holds.length && (
              <EmptyRow colSpan={6}>
                {query.isLoading
                  ? 'Ачаалж байна…'
                  : 'Hold алга. “Нислэг хайх”-аас огноо сонгож hold хийнэ.'}
              </EmptyRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <BookingDialog
        quota={naming ? toQuota(naming) : null}
        hold={naming}
        onClose={() => setNaming(null)}
      />
      {releasing && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setReleasing(null)}
          title='Hold цуцлах уу?'
          desc={`${releasing.flight_number}: нэр ороогүй ${releasing.usage.remaining} суудал чөлөөлөгдөнө. Нэр орсон зорчигчид хэвээр үлдэнэ.`}
          confirmText='Цуцлах'
          destructive
          isLoading={release.isPending}
          handleConfirm={() => release.mutate(releasing.id)}
        />
      )}
    </Main>
  )
}
