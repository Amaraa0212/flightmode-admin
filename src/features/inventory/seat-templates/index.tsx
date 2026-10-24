import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  inventoryTemplateService,
  rbdService,
  type InventoryTemplate,
  type InventoryTemplatePayload,
} from '@/services'
import { toast } from 'sonner'
import { useCan } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { BaseDialog } from '@/components/ui/base-dialog'
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
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import {
  byHierarchy,
  DeleteDialog,
  EmptyRow,
  Panel,
  RowActions,
} from '@/features/fare-settings/shared'
import {
  CABIN_NAMES,
  classCaps,
  SeatInput,
} from '@/features/inventory/seat-allocations/components/shared'

const route = getRouteApi('/_authenticated/inventory/seat-templates/')
const KEY = ['inventory', 'templates']

function useTemplateMutation<V>(
  run: (v: V) => Promise<{ message: string }>,
  onDone?: () => void
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({
        queryKey: ['options', 'inventory-templates'],
      })
      onDone?.()
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function SeatTemplates() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canManage = useCan()('inventory.manage')
  const [editing, setEditing] = useState<InventoryTemplate | null>(null)
  const [removing, setRemoving] = useState<InventoryTemplate | null>(null)

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () =>
      (await inventoryTemplateService.all()).body.items ?? [],
  })
  const templates = query.data ?? []
  const selected = templates.find((t) => t.id === search.template)

  const remove = useTemplateMutation(
    (t: InventoryTemplate) => inventoryTemplateService.remove(t.id),
    () => {
      if (removing?.id === search.template) navigate({ search: {} })
      setRemoving(null)
    }
  )

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Seat allocation templates'
        description='Saved cabin seats and class limits. Create one with "Save as template" on a flight, apply it from Seat allocations or a flight series.'
        actions={
          <Button asChild size='sm' variant='outline' className='h-8'>
            <Link to='/inventory/seat-allocations'>Seat allocations</Link>
          </Button>
        }
      />

      <Panel title='Templates' subtitle={`${templates.length} total`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Aircraft</TableHead>
              <TableHead>Cabins</TableHead>
              <TableHead className='text-end'>Classes</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead className='text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow
                key={t.id}
                onClick={() => navigate({ search: { template: t.id } })}
                className={cn(
                  'cursor-pointer',
                  t.id === search.template &&
                    'bg-cyan-400/10 hover:bg-cyan-400/15'
                )}
              >
                <TableCell>
                  <p className='font-semibold'>{t.name}</p>
                  {t.description && (
                    <p className='text-muted-foreground text-xs'>
                      {t.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {t.aircraft
                    ? `${t.aircraft.registration} · ${t.aircraft.type}`
                    : '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {t.cabins
                    .map((c) => `${c.cabin_class} ${c.seats}`)
                    .join(' · ')}
                </TableCell>
                <TableCell className='text-end font-mono'>
                  {t.rbds.length}
                </TableCell>
                <TableCell className='text-muted-foreground text-xs'>
                  {t.created_by ?? '-'}
                </TableCell>
                <TableCell>
                  <RowActions
                    onEdit={canManage ? () => setEditing(t) : undefined}
                    onDelete={canManage ? () => setRemoving(t) : undefined}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!templates.length && (
              <EmptyRow colSpan={6}>
                {query.isLoading
                  ? 'Loading…'
                  : 'No template yet. Open a flight in Seat allocations and use "Save as template".'}
              </EmptyRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      {selected && (
        <TemplateEditor
          key={`${selected.id}-${query.dataUpdatedAt}`}
          template={selected}
          canManage={canManage}
        />
      )}

      {editing && (
        <RenameDialog template={editing} onClose={() => setEditing(null)} />
      )}
      {removing && (
        <DeleteDialog
          label={`template "${removing.name}"`}
          isLoading={remove.isPending}
          onConfirm={() => remove.mutate(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
    </Main>
  )
}

type CabinDraft = Record<
  string,
  { seats: number | ''; oversell: number | ''; curtail: number | '' }
>
type RbdDraft = Record<number, { seats: number | ''; is_closed: boolean }>

/** Cabin seats and class limits of a template, edited like a flight */
function TemplateEditor({
  template,
  canManage,
}: {
  template: InventoryTemplate
  canManage: boolean
}) {
  const { data: rbds = [] } = useQuery({
    queryKey: ['fare-settings', 'rbds'],
    queryFn: async () => (await rbdService.all()).body.items ?? [],
  })
  const cabins = template.cabins.map((c) => c.cabin_class as string)
  const tree = useMemo(
    () =>
      byHierarchy(rbds).filter(
        (r) =>
          cabins.includes(r.cabin_class) &&
          (r.is_active || template.rbds.some((t) => t.rbd_id === r.id))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rbds, template]
  )

  const [cabinDraft, setCabinDraft] = useState<CabinDraft>(() =>
    Object.fromEntries(
      template.cabins.map((c) => [
        c.cabin_class,
        { seats: c.seats, oversell: c.oversell, curtail: c.curtail },
      ])
    )
  )
  const [rbdDraft, setRbdDraft] = useState<RbdDraft>(() =>
    Object.fromEntries(
      template.rbds.map((r) => [
        r.rbd_id,
        { seats: r.seats, is_closed: r.is_closed },
      ])
    )
  )

  // same rule as a flight: a class up to its parent, a root up to its cabin (seats + oversell)
  const caps = classCaps(
    tree,
    (id) => rbdDraft[id]?.seats,
    (cabin) =>
      Number(cabinDraft[cabin]?.seats || 0) +
      Number(cabinDraft[cabin]?.oversell || 0)
  )
  const invalid = tree.filter((r) => {
    const seats = rbdDraft[r.id]?.seats
    return seats !== '' && seats !== undefined && seats > caps[r.id].cap
  })

  const save = useTemplateMutation((payload: InventoryTemplatePayload) =>
    inventoryTemplateService.update(template.id, payload)
  )

  const submit = () =>
    save.mutate({
      cabins: Object.entries(cabinDraft)
        .filter(([, v]) => v.seats !== '')
        .map(([cabin, v]) => ({
          cabin_class:
            cabin as InventoryTemplate['cabins'][number]['cabin_class'],
          seats: Number(v.seats),
          oversell: Number(v.oversell || 0),
          curtail: Number(v.curtail || 0),
        })),
      rbds: Object.entries(rbdDraft)
        .filter(([, v]) => v.seats !== '')
        .map(([id, v]) => ({
          rbd_id: Number(id),
          seats: Number(v.seats),
          is_closed: v.is_closed,
        })),
    })

  return (
    <Panel
      title={template.name}
      subtitle={
        invalid.length ? (
          <span className='text-red-600 dark:text-red-400'>
            {invalid.map((r) => r.code).join(', ')}: above the parent / cabin —
            lower to save.
          </span>
        ) : (
          'Classes left empty do not sell on flights that get this template.'
        )
      }
      actions={
        canManage && (
          <Button
            size='sm'
            className='h-8'
            disabled={save.isPending || invalid.length > 0}
            onClick={submit}
          >
            Save template
          </Button>
        )
      }
    >
      <div className='grid gap-6 p-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>COS</TableHead>
              <TableHead className='text-end'>Seats</TableHead>
              <TableHead className='text-end'>Oversell</TableHead>
              <TableHead className='text-end'>Curtail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {template.cabins.map((c) => (
              <TableRow key={c.cabin_class}>
                <TableCell>
                  <span className='font-mono font-semibold'>
                    {c.cabin_class}
                  </span>{' '}
                  <span className='text-muted-foreground text-xs'>
                    {CABIN_NAMES[c.cabin_class]}
                  </span>
                </TableCell>
                {(['seats', 'oversell', 'curtail'] as const).map((field) => (
                  <TableCell key={field}>
                    <div className='flex justify-end'>
                      <SeatInput
                        label={`${c.cabin_class} ${field}`}
                        disabled={!canManage}
                        value={cabinDraft[c.cabin_class]?.[field]}
                        onChange={(v) =>
                          setCabinDraft((d) => ({
                            ...d,
                            [c.cabin_class]: {
                              ...d[c.cabin_class],
                              [field]: v,
                            },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>COS</TableHead>
              <TableHead>BC</TableHead>
              <TableHead className='text-end'>Seats</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className='text-end'>Rank</TableHead>
              <TableHead>Parent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tree.map((r) => {
              const d = rbdDraft[r.id]
              return (
                <TableRow key={r.id}>
                  <TableCell className='font-mono text-xs'>
                    {r.cabin_class}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'font-mono font-semibold',
                      d?.is_closed &&
                        'text-red-600 line-through dark:text-red-400'
                    )}
                  >
                    <span style={{ paddingInlineStart: r.level * 14 }}>
                      {r.level > 0 && (
                        <span className='text-muted-foreground me-1'>└</span>
                      )}
                      {r.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end'>
                      <SeatInput
                        label={`Seats of class ${r.code}`}
                        disabled={!canManage}
                        placeholder='not set'
                        value={d?.seats}
                        max={caps[r.id].cap}
                        invalid={invalid.includes(r)}
                        hint={`Max ${caps[r.id].cap} (${caps[r.id].by})`}
                        onChange={(v) =>
                          setRbdDraft((all) => ({
                            ...all,
                            [r.id]: {
                              is_closed: all[r.id]?.is_closed ?? false,
                              seats: v,
                            },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      aria-label={`Close class ${r.code}`}
                      disabled={!canManage || !d || d.seats === ''}
                      checked={!!d?.is_closed}
                      onCheckedChange={(v) =>
                        setRbdDraft((all) => ({
                          ...all,
                          [r.id]: { ...all[r.id], is_closed: v },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell className='text-end font-mono'>{r.rank}</TableCell>
                  <TableCell className='font-mono'>
                    {r.parent_code ?? ''}
                  </TableCell>
                </TableRow>
              )
            })}
            {!tree.length && (
              <EmptyRow colSpan={6}>No RBD for these cabins</EmptyRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Panel>
  )
}

function RenameDialog({
  template,
  onClose,
}: {
  template: InventoryTemplate
  onClose: () => void
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const save = useTemplateMutation(
    () =>
      inventoryTemplateService.update(template.id, {
        name: name.trim(),
        description: description.trim() || null,
      }),
    onClose
  )

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title='Edit template'
      maxWidth='md'
      className='p-1'
      submitButton={{
        text: 'Save',
        onClick: () => save.mutate(undefined),
        loading: save.isPending,
        disabled: !name.trim(),
      }}
    >
      <div className='grid gap-4'>
        <div className='grid gap-1.5'>
          <Label htmlFor='tpl-name'>Name</Label>
          <Input
            id='tpl-name'
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='tpl-description'>Description</Label>
          <Input
            id='tpl-description'
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </BaseDialog>
  )
}
