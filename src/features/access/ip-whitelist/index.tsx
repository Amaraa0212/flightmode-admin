import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  airlineOptions,
  ipAccessService,
  type AirlineIpAccess,
} from '@/services'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { usePagePermissions } from '@/hooks/use-page-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { SimpleSelect } from '@/components/simple-select'

type Address = AirlineIpAccess['addresses'][number]

/**
 * Access → IP access: an airline limits its back-office staff (role scope "airline") to registered addresses.
 * Airport (DCS / gate) and agency logins are not affected. Airline users see their own airline,
 * system administrators pick one.
 */
export function IpWhitelist() {
  const queryClient = useQueryClient()
  const isSystemAdmin = useAuthStore((s) => !!s.auth.user?.is_system_admin)
  const { canCreate, canUpdate, canDelete } = usePagePermissions()
  const [airlineId, setAirlineId] = useState<string>('')
  const [draft, setDraft] = useState({ ip: '', note: '' })
  const [editing, setEditing] = useState<{
    id: number
    ip: string
    note: string
  } | null>(null)
  const [removing, setRemoving] = useState<Address | null>(null)

  const airlines = useQuery({
    queryKey: ['airline-options'],
    queryFn: airlineOptions,
    enabled: isSystemAdmin,
  })
  const queryKey = ['ip-access', airlineId]
  const data = useQuery({
    queryKey,
    queryFn: () =>
      ipAccessService.get(airlineId ? Number(airlineId) : undefined),
    enabled: !isSystemAdmin || !!airlineId,
  })
  const access = data.data?.access ?? null
  const currentIp = data.data?.currentIp

  const done = (res: { message: string; body: AirlineIpAccess }) => {
    toast.success(res.message)
    queryClient.setQueryData(queryKey, { access: res.body, currentIp })
  }
  const onError = (error: Error) => toast.error(error.message)

  const setEnabled = useMutation({
    mutationFn: (enabled: boolean) =>
      ipAccessService.setEnabled(access!.airline.id, enabled),
    onSuccess: done,
    onError,
  })
  const add = useMutation({
    mutationFn: () =>
      ipAccessService.add(access!.airline.id, {
        ip: draft.ip.trim(),
        note: draft.note.trim() || undefined,
      }),
    onSuccess: (res) => {
      done(res)
      setDraft({ ip: '', note: '' })
    },
    onError,
  })
  const update = useMutation({
    mutationFn: (e: { id: number; ip: string; note: string }) =>
      ipAccessService.update(access!.airline.id, e.id, {
        ip: e.ip.trim(),
        note: e.note.trim() || undefined,
      }),
    onSuccess: (res) => {
      done(res)
      setEditing(null)
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: number) => ipAccessService.remove(access!.airline.id, id),
    onSuccess: (res) => {
      done(res)
      setRemoving(null)
    },
    onError,
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='IP access'
        description='When it is on, the airline’s back-office staff can sign in and use the system only from these addresses (IPv4 / IPv6 or a CIDR range such as 203.0.113.0/24). DCS / gate staff and agencies are not limited.'
      />

      {isSystemAdmin && (
        <div className='grid max-w-sm gap-1.5'>
          <Label>Airline</Label>
          <SimpleSelect
            value={airlineId}
            onValueChange={setAirlineId}
            items={airlines.data ?? []}
            placeholder='Choose an airline'
          />
        </div>
      )}

      {currentIp && (
        <p className='text-muted-foreground text-sm'>
          Your current address:{' '}
          <span className='text-foreground font-mono'>{currentIp}</span>
        </p>
      )}

      {access && (
        <>
          <div className='flex items-center gap-3 rounded-md border p-4'>
            <Switch
              checked={access.enabled}
              disabled={!canUpdate || setEnabled.isPending}
              onCheckedChange={(v) => setEnabled.mutate(v)}
            />
            <div>
              <div className='text-sm font-medium'>
                IP restriction for {access.airline.iata_code} ·{' '}
                {access.airline.name} {access.enabled ? 'is on' : 'is off'}
              </div>
              <div className='text-muted-foreground text-xs'>
                {access.enabled
                  ? 'Staff outside these addresses are signed out and cannot sign in.'
                  : 'Staff can sign in from anywhere.'}
              </div>
            </div>
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className='w-28' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {access.addresses.map((a) =>
                  editing?.id === a.id ? (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Input
                          value={editing.ip}
                          onChange={(e) =>
                            setEditing({ ...editing, ip: e.target.value })
                          }
                          className='h-8 font-mono'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editing.note}
                          onChange={(e) =>
                            setEditing({ ...editing, note: e.target.value })
                          }
                          className='h-8'
                        />
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='size-7'
                          onClick={() => update.mutate(editing)}
                        >
                          <Check className='size-3.5' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='size-7'
                          onClick={() => setEditing(null)}
                        >
                          <X className='size-3.5' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={a.id}>
                      <TableCell className='font-mono'>{a.ip}</TableCell>
                      <TableCell className='text-muted-foreground'>
                        {a.note}
                      </TableCell>
                      <TableCell className='text-right'>
                        {canUpdate && (
                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7'
                            onClick={() =>
                              setEditing({
                                id: a.id,
                                ip: a.ip,
                                note: a.note ?? '',
                              })
                            }
                          >
                            <Pencil className='size-3.5' />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size='icon'
                            variant='ghost'
                            className='text-destructive size-7'
                            onClick={() => setRemoving(a)}
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
                {access.addresses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className='text-muted-foreground py-6 text-center'
                    >
                      No addresses yet.
                    </TableCell>
                  </TableRow>
                )}
                {canCreate && (
                  <TableRow>
                    <TableCell>
                      <Input
                        value={draft.ip}
                        onChange={(e) =>
                          setDraft({ ...draft, ip: e.target.value })
                        }
                        placeholder={currentIp ?? '203.0.113.0/24'}
                        className='h-8 font-mono'
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={draft.note}
                        onChange={(e) =>
                          setDraft({ ...draft, note: e.target.value })
                        }
                        onKeyDown={(e) =>
                          e.key === 'Enter' && draft.ip.trim() && add.mutate()
                        }
                        placeholder='e.g. Head office'
                        className='h-8'
                      />
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        size='sm'
                        className='h-8 gap-1'
                        disabled={!draft.ip.trim() || add.isPending}
                        onClick={() => add.mutate()}
                      >
                        <Plus className='size-3.5' /> Add
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          title='Remove IP address'
          desc={`Remove ${removing.ip}? Staff on it can no longer sign in while the restriction is on.`}
          confirmText='Remove'
          destructive
          isLoading={remove.isPending}
          handleConfirm={() => remove.mutate(removing.id)}
        />
      )}
    </Main>
  )
}
