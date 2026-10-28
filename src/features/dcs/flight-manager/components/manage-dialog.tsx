import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flightOpsService,
  type FlightAction,
  type FlightBoardRow,
} from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCan } from '@/stores/auth-store'
import { FLIGHT_STATUS } from '@/constants/status'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CheckList } from '@/components/check-list'
import { SimpleSelect } from '@/components/simple-select'
import { StatusChip } from '@/components/status-chip'
import { pageConfig } from './config'

const DELAY_REASONS = [
  '11 Late check-in',
  '15 Boarding',
  '41 Aircraft defect',
  '71 Weather',
  '81 ATC restriction',
  '93 Aircraft rotation',
].map((r) => ({ label: r, value: r }))

/** "2026-09-29T08:00:00Z" → value for <input type=datetime-local> (local time) */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}
const fromLocalInput = (value: string) =>
  value ? new Date(value).toISOString() : null

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className='fm-inset space-y-3 p-4'>
      <p className='fm-label'>{title}</p>
      {children}
    </section>
  )
}

export function ManageDialog({
  flightId,
  onClose,
}: {
  flightId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data: flight } = useQuery({
    queryKey: [pageConfig.queryKey, 'detail', flightId],
    queryFn: async () => (await flightOpsService.getById(flightId)).body,
  })
  const { data: candidates = [] } = useQuery({
    queryKey: ['admin-gate-agent-candidates', flightId],
    queryFn: async () =>
      (await flightOpsService.gateAgentCandidates(flightId)).body ?? [],
  })

  const done = (res: { message: string }) => {
    toast.success(res.message)
    queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
  }
  const onError = (error: Error) => toast.error(error.message)

  const update = useMutation({
    mutationFn: (patch: Parameters<typeof flightOpsService.update>[1]) =>
      flightOpsService.update(flightId, patch),
    onSuccess: done,
    onError,
  })
  const action = useMutation({
    mutationFn: (vars: {
      action: FlightAction
      data?: Parameters<typeof flightOpsService.action>[2]
    }) => flightOpsService.action(flightId, vars.action, vars.data),
    onSuccess: done,
    onError,
  })

  if (!flight) return null
  return (
    <ManageForm
      flight={flight}
      candidates={candidates}
      update={update}
      action={action}
      onClose={onClose}
    />
  )
}

function ManageForm({
  flight,
  candidates,
  update,
  action,
  onClose,
}: {
  flight: FlightBoardRow
  candidates: { id: number; name: string }[]
  update: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof flightOpsService.update>>,
      Error,
      Parameters<typeof flightOpsService.update>[1]
    >
  >
  action: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof flightOpsService.action>>,
      Error,
      {
        action: FlightAction
        data?: Parameters<typeof flightOpsService.action>[2]
      }
    >
  >
  onClose: () => void
}) {
  const [gate, setGate] = useState(flight.gate ?? '')
  // close check-in / gate / depart: OCC only; cancel / reopen: airline administrator only
  const can = useCan()
  const canClose = can('flights.close')
  const canCancel = can('flights.cancel')
  const closeHint = canClose
    ? undefined
    : 'Only OCC can close check-in, the gate or the flight'
  const cancelHint = canCancel
    ? undefined
    : 'Only the airline administrator can cancel or reopen a flight'
  const reopenable = ['checkin_closed', 'gate_closed', 'cancelled'].includes(
    flight.status
  )
  const [agents, setAgents] = useState(
    flight.ops.gate_agents.map((a) => String(a.id))
  )
  const [obt, setObt] = useState(
    toLocalInput(flight.ops.off_block_at ?? flight.scheduled_departure_at)
  )
  const [tt, setTt] = useState(toLocalInput(flight.ops.takeoff_at))
  const [et, setEt] = useState(
    toLocalInput(flight.ops.estimated_arrival_at ?? flight.scheduled_arrival_at)
  )
  const [delay, setDelay] = useState(flight.ops.delay_reason ?? '')
  const [cancelReason, setCancelReason] = useState('')
  const busy = update.isPending || action.isPending

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-3'>
            <span className='text-brand font-mono'>{flight.flight_number}</span>
            {flight.origin.iata_code} → {flight.destination.iata_code}
            <StatusChip value={flight.status} map={FLIGHT_STATUS} size='md' />
          </DialogTitle>
          <DialogDescription>
            SCH: {flight.scheduled_departure_at.slice(0, 16).replace('T', ' ')}{' '}
            UTC · {flight.aircraft?.registration} · CKI {flight.pax.checked_in}/
            {flight.pax.booked}
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-3'>
          <Section title='Gate'>
            <div className='grid gap-1.5'>
              <Label>Gate number</Label>
              <Input
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                placeholder='Enter gate number'
              />
            </div>
            <Button
              size='sm'
              disabled={busy}
              onClick={() => update.mutate({ gate })}
            >
              Update
            </Button>
          </Section>

          <Section title='Gate users & online check-in'>
            <CheckList
              options={candidates.map((c) => ({
                label: c.name,
                value: String(c.id),
              }))}
              value={agents}
              onChange={setAgents}
              className='max-h-32 overflow-y-auto'
            />
            <div className='flex items-center justify-between'>
              <Label>Online check-in (OCI)</Label>
              <Switch
                checked={flight.ops.online_checkin_enabled}
                onCheckedChange={(on) =>
                  update.mutate({ online_checkin_enabled: on })
                }
                disabled={busy}
              />
            </div>
            <Button
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() =>
                update.mutate({
                  gate_agents: candidates.filter((c) =>
                    agents.includes(String(c.id))
                  ),
                })
              }
            >
              Save gate users
            </Button>
          </Section>

          <Section title='Check-in & gate'>
            <div className='flex flex-wrap gap-2'>
              <Button
                size='sm'
                disabled={busy || flight.status !== 'scheduled'}
                onClick={() => action.mutate({ action: 'open_checkin' })}
              >
                Open check-in
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={busy || !canClose || flight.status !== 'checkin_open'}
                title={closeHint}
                onClick={() => action.mutate({ action: 'close_checkin' })}
              >
                Close check-in
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={
                  busy ||
                  !canClose ||
                  !['checkin_open', 'checkin_closed'].includes(flight.status)
                }
                title={closeHint}
                onClick={() => action.mutate({ action: 'close_gate' })}
              >
                Close gate
              </Button>
              <Button
                size='sm'
                variant='secondary'
                disabled={busy}
                onClick={() =>
                  toast.success('APIS sent to destination authorities (mock)')
                }
              >
                Send APIS
              </Button>
            </div>
            {closeHint && (
              <p className='text-muted-foreground text-xs'>{closeHint}</p>
            )}
          </Section>

          <Section title='Cancel / reopen flight'>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder='Reason (required)'
              rows={2}
            />
            <Button
              size='sm'
              variant='destructive'
              disabled={
                busy ||
                !canCancel ||
                !cancelReason.trim() ||
                ['departed', 'cancelled', 'gate_closed'].includes(flight.status)
              }
              title={cancelHint}
              onClick={() =>
                action.mutate({
                  action: 'cancel',
                  data: { reason: cancelReason },
                })
              }
            >
              Cancel flight
            </Button>
            <Button
              size='sm'
              variant='outline'
              disabled={busy || !canCancel || !reopenable}
              title={
                cancelHint ??
                (flight.status === 'cancelled'
                  ? 'Back to scheduled'
                  : 'Opens check-in again')
              }
              onClick={() => action.mutate({ action: 'reopen' })}
            >
              Reopen flight
            </Button>
            {cancelHint && (
              <p className='text-muted-foreground text-xs'>{cancelHint}</p>
            )}
          </Section>

          <div className='col-span-2'>
            <Section title='Close flight and time'>
              <div className='grid grid-cols-3 gap-3'>
                <div className='grid gap-1.5'>
                  <Label>Off-block time (OBT)</Label>
                  <Input
                    type='datetime-local'
                    value={obt}
                    onChange={(e) => setObt(e.target.value)}
                  />
                </div>
                <div className='grid gap-1.5'>
                  <Label>Takeoff time (TT)</Label>
                  <Input
                    type='datetime-local'
                    value={tt}
                    onChange={(e) => setTt(e.target.value)}
                  />
                </div>
                <div className='grid gap-1.5'>
                  <Label>Estimated arrival (ET)</Label>
                  <Input
                    type='datetime-local'
                    value={et}
                    onChange={(e) => setEt(e.target.value)}
                  />
                </div>
              </div>
              <div className='grid gap-1.5'>
                <Label>Reason for delay</Label>
                <SimpleSelect
                  value={delay || undefined}
                  onValueChange={setDelay}
                  items={DELAY_REASONS}
                  placeholder='Please select reason'
                  className='w-full'
                />
              </div>
              <Button
                disabled={busy || !canClose || flight.status !== 'gate_closed'}
                title={closeHint}
                onClick={() =>
                  action.mutate({
                    action: 'depart',
                    data: {
                      off_block_at: fromLocalInput(obt) ?? undefined,
                      takeoff_at: fromLocalInput(tt) ?? undefined,
                      estimated_arrival_at: fromLocalInput(et) ?? undefined,
                      reason: delay || undefined,
                    },
                  })
                }
              >
                {action.isPending && (
                  <Loader2 className='size-4 animate-spin' />
                )}
                Close flight (departed)
              </Button>
              {closeHint && (
                <p className='text-muted-foreground text-xs'>{closeHint}</p>
              )}
            </Section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
