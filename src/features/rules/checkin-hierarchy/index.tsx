import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  aircraftOptions,
  loadZoneService,
  seatMapService,
  seatProfileService,
  type LoadZone,
  type SeatAssignmentProfile,
} from '@/services'
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useOptions } from '@/hooks/use-options'
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
import { SimpleSelect } from '@/components/simple-select'
import { ProfileDialog, QUERY_KEY, ZoneDialog } from './components/dialogs'

const route = getRouteApi('/_authenticated/rules/checkin-hierarchy/')

export function CheckinHierarchy() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const options = useOptions('aircraft', aircraftOptions)
  const aircraftId = search.aircraft ?? Number(options[0]?.value)
  const [zoneDialog, setZoneDialog] = useState<{ zone?: LoadZone } | null>(null)
  const [profileDialog, setProfileDialog] = useState<{
    profile?: SeatAssignmentProfile
  } | null>(null)

  const { data: zones = [] } = useQuery({
    queryKey: [QUERY_KEY, 'zones', aircraftId],
    queryFn: async () => (await loadZoneService.list(aircraftId)).body ?? [],
    enabled: !!aircraftId,
  })
  const { data: profiles = [] } = useQuery({
    queryKey: [QUERY_KEY, 'profiles', aircraftId],
    queryFn: async () => (await seatProfileService.list(aircraftId)).body ?? [],
    enabled: !!aircraftId,
  })
  const { data: layout } = useQuery({
    queryKey: [QUERY_KEY, 'layout', aircraftId],
    queryFn: async () => (await seatMapService.layout(aircraftId)).body,
    enabled: !!aircraftId,
  })

  const remove = useMutation({
    mutationFn: (
      vars:
        | { kind: 'zone'; zone: LoadZone }
        | { kind: 'profile'; profile: SeatAssignmentProfile }
    ) =>
      vars.kind === 'zone'
        ? loadZoneService.remove(vars.zone)
        : seatProfileService.remove(vars.profile),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Check-in hierarchy'
        description='Load zones (online check-in opens zones by passenger count) and auto-seat zone priority'
        actions={
          <SimpleSelect
            value={String(aircraftId)}
            onValueChange={(v) => navigate({ search: { aircraft: Number(v) } })}
            items={options}
            className='w-64'
          />
        }
      />

      <div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4'>
        <div className='space-y-4'>
          <section className='fm-panel overflow-hidden'>
            <div className='flex items-center justify-between border-b px-4 py-3'>
              <div>
                <p className='text-sm font-semibold'>Load zones</p>
                <p className='text-muted-foreground text-xs'>
                  Legacy airplane rule: PAX seq min / max → zone
                </p>
              </div>
              <Button
                size='sm'
                className='gap-2'
                onClick={() => setZoneDialog({})}
              >
                <Plus className='size-4' />
                Add zone
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PAX seq min</TableHead>
                  <TableHead>PAX seq max</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className='font-mono'>{z.pax_from}</TableCell>
                    <TableCell className='font-mono'>{z.pax_to}</TableCell>
                    <TableCell className='text-brand font-mono font-semibold'>
                      {z.zone}
                    </TableCell>
                    <TableCell className='text-end'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8'
                        onClick={() => setZoneDialog({ zone: z })}
                        aria-label='Edit zone'
                      >
                        <Pencil className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 text-red-500'
                        onClick={() =>
                          remove.mutate({ kind: 'zone', zone: z })
                        }
                        aria-label='Delete zone'
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!zones.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className='text-muted-foreground h-16 text-center'
                    >
                      No load zones — every zone is open for online check-in
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className='fm-panel overflow-hidden'>
            <div className='flex items-center justify-between border-b px-4 py-3'>
              <div>
                <p className='text-sm font-semibold'>Auto-seat priority</p>
                <p className='text-muted-foreground text-xs'>
                  Legacy seat zone: order in which the counter fills zones
                </p>
              </div>
              <Button
                size='sm'
                className='gap-2'
                onClick={() => setProfileDialog({})}
              >
                <Plus className='size-4' />
                Add hierarchy
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Zone order</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className='font-medium'>{p.name}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        {p.zones.map((zone, i) => (
                          <span key={zone} className='flex items-center gap-1'>
                            {i > 0 && (
                              <ChevronRight className='text-muted-foreground size-3' />
                            )}
                            <span className='text-brand bg-surface rounded border px-1.5 font-mono text-xs font-semibold'>
                              {zone}
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className='text-end'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8'
                        onClick={() => setProfileDialog({ profile: p })}
                        aria-label='Edit profile'
                      >
                        <Pencil className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 text-red-500'
                        onClick={() =>
                          remove.mutate({ kind: 'profile', profile: p })
                        }
                        aria-label='Delete profile'
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>

        <div className='fm-panel p-4'>
          <p className='fm-label mb-3'>Zones on {layout?.registration}</p>
          {layout && <SeatMapGrid layout={layout} />}
        </div>
      </div>

      {zoneDialog && (
        <ZoneDialog
          aircraftId={aircraftId}
          zone={zoneDialog.zone}
          onClose={() => setZoneDialog(null)}
        />
      )}
      {profileDialog && (
        <ProfileDialog
          aircraftId={aircraftId}
          profile={profileDialog.profile}
          onClose={() => setProfileDialog(null)}
        />
      )}
    </Main>
  )
}
