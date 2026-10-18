import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useOptions } from '@/hooks/use-options'
import { aircraftOptions, seatMapService, type SeatBlock } from '@/services'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { SeatMapGrid } from '@/components/seat-map-grid'
import { BlockDialog } from './components/block-dialog'

const route = getRouteApi('/_authenticated/fleet/seat-maps/')

export function SeatMaps() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const aircraft = useOptions('aircraft', aircraftOptions)
  const aircraftId = search.aircraft ?? Number(aircraft[0]?.value)
  const [dialog, setDialog] = useState<{ block?: SeatBlock } | null>(null)

  const { data: blocks = [] } = useQuery({
    queryKey: ['admin-seat-map', 'blocks', aircraftId],
    queryFn: async () => (await seatMapService.blocks(aircraftId)).body ?? [],
  })
  const { data: layout } = useQuery({
    queryKey: ['admin-seat-map', 'layout', aircraftId],
    queryFn: async () => (await seatMapService.layout(aircraftId)).body,
  })
  const remove = useMutation({
    mutationFn: async (block: SeatBlock) => seatMapService.removeBlock(block),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['admin-seat-map'] })
    },
  })

  const seats =
    layout?.rows.reduce((s, r) => s + r.seats.filter(Boolean).length, 0) ?? 0

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Seatmap'
        description='Seat configuration per aircraft: row blocks with left / mid / right seat letters, cabin and zone'
        actions={
          <Button size='sm' className='gap-2' onClick={() => setDialog({})}>
            <Plus className='size-4' />
            Add seat configuration
          </Button>
        }
      />

      <div className='grid grid-cols-[220px_minmax(0,1fr)_auto] items-start gap-4'>
        <div className='fm-panel p-2'>
          <p className='fm-label px-2 py-1.5'>Airplane list</p>
          {aircraft.map((a) => (
            <button
              key={a.value}
              type='button'
              onClick={() =>
                navigate({ search: { aircraft: Number(a.value) } })
              }
              className={cn(
                'w-full rounded-lg px-3 py-2 text-start text-sm transition',
                Number(a.value) === aircraftId
                  ? 'bg-cyan-400/10 text-cyan-600 dark:text-cyan-300'
                  : 'hover:bg-muted'
              )}
            >
              <span className='font-mono font-semibold'>
                {a.label.split(' · ')[0]}
              </span>
              <span className='text-muted-foreground block text-xs'>
                {a.label.split(' · ')[1]}
              </span>
            </button>
          ))}
        </div>

        <div className='fm-panel overflow-hidden'>
          <div className='flex items-center justify-between border-b px-4 py-3'>
            <p className='text-sm font-semibold'>{blocks.length} seat blocks</p>
            <p className='text-muted-foreground text-xs'>{seats} seats</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row start</TableHead>
                <TableHead>Row end</TableHead>
                <TableHead>Left</TableHead>
                <TableHead>Mid</TableHead>
                <TableHead>Right</TableHead>
                <TableHead>Cabin</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Exit rows</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className='font-mono'>{b.row_from}</TableCell>
                  <TableCell className='font-mono'>{b.row_to}</TableCell>
                  <TableCell className='font-mono'>{b.left || '-'}</TableCell>
                  <TableCell className='font-mono'>{b.middle || '-'}</TableCell>
                  <TableCell className='font-mono'>{b.right || '-'}</TableCell>
                  <TableCell className='font-mono'>{b.cabin_class}</TableCell>
                  <TableCell className='text-brand font-mono font-semibold'>
                    {b.zone}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {b.exit_rows.join(', ') || '-'}
                  </TableCell>
                  <TableCell className='text-end'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      onClick={() => setDialog({ block: b })}
                      aria-label='Edit block'
                    >
                      <Pencil className='size-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 text-red-500'
                      onClick={() => remove.mutate(b)}
                      aria-label='Delete block'
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!blocks.length && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className='text-muted-foreground h-24 text-center'
                  >
                    0 seatmaps
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className='fm-panel p-4'>
          <p className='fm-label mb-3'>Preview · {layout?.type}</p>
          {layout && <SeatMapGrid layout={layout} />}
        </div>
      </div>

      {dialog && (
        <BlockDialog
          aircraftId={aircraftId}
          block={dialog.block}
          onClose={() => setDialog(null)}
        />
      )}
    </Main>
  )
}
