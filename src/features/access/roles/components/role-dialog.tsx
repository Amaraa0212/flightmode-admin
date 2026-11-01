import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  airlineOptions,
  roleService,
  type PermissionMatrixGroup,
  type Role,
} from '@/services'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleSelect } from '@/components/simple-select'
import { ROLE_SCOPE_OPTIONS, pageConfig } from './config'

/** Matrix columns; any other action of a menu (close, export ...) shows in "Other" */
const CRUD = ['view', 'create', 'update', 'delete'] as const
const SHARED = 'shared'

type MatrixMenu = PermissionMatrixGroup['menus'][number]

/** Checkbox for a set of keys: on / off / some */
function GroupCheck({
  keys,
  selected,
  onChange,
  disabled,
}: {
  keys: string[]
  selected: Set<string>
  onChange: (keys: string[], on: boolean) => void
  disabled?: boolean
}) {
  if (keys.length === 0) return null
  const on = keys.filter((k) => selected.has(k)).length
  return (
    <Checkbox
      disabled={disabled}
      checked={on === keys.length}
      // some granted: tinted box, a click grants all
      className={cn(on > 0 && on < keys.length && 'border-primary bg-primary/30')}
      onCheckedChange={(v) => onChange(keys, v === true)}
    />
  )
}

export function RoleDialog({
  role,
  readOnly,
  onClose,
}: {
  role?: Role
  /** a shared / foreign role, or no update permission */
  readOnly?: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const isSystemAdmin = !!user?.is_system_admin
  const [name, setName] = useState(role?.name ?? '')
  const [slug, setSlug] = useState(role?.slug ?? '')
  const [scope, setScope] = useState<Role['scope']>(role?.scope ?? 'airline')
  const [airlineId, setAirlineId] = useState(
    role?.airline_id ? String(role.airline_id) : SHARED
  )
  const [selected, setSelected] = useState(
    () => new Set<string>(role?.permissions ?? [])
  )

  const matrix = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: roleService.matrix,
  })
  const airlines = useQuery({
    queryKey: ['airline-options'],
    queryFn: airlineOptions,
    enabled: isSystemAdmin,
  })

  // airline users make airline / airport roles; only menus of the role's scope are listed
  const scopeOptions = isSystemAdmin
    ? ROLE_SCOPE_OPTIONS
    : ROLE_SCOPE_OPTIONS.filter(
        (o) => o.value === 'airline' || o.value === 'airport'
      )
  const groups = useMemo(
    () =>
      (matrix.data ?? [])
        .map((group) => ({
          ...group,
          menus: group.menus.filter(
            (m) => !m.scopes || m.scopes.includes(scope)
          ),
        }))
        .filter((group) => group.menus.length > 0),
    [matrix.data, scope]
  )
  const allKeys = groups.flatMap((g) =>
    g.menus.flatMap((m) => m.permissions.map((p) => p.key))
  )
  const granted = allKeys.filter((k) => selected.has(k)).length

  const toggle = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)))
      return next
    })

  const save = useMutation({
    mutationFn: () =>
      roleService.save(
        {
          name,
          slug: slug || name.toLowerCase().trim().replace(/\s+/g, '_'),
          scope,
          ...(isSystemAdmin && {
            airline_id: airlineId === SHARED ? null : Number(airlineId),
          }),
          // keys of menus hidden for this scope are dropped
          permissions: allKeys.filter((k) => selected.has(k)),
        },
        role?.id
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const actionKey = (menu: MatrixMenu, action: string) =>
    menu.permissions.find((p) => p.action === action)?.key
  const otherActions = (menu: MatrixMenu) =>
    menu.permissions.filter(
      (p) => !(CRUD as readonly string[]).includes(p.action)
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>
            {role
              ? `${readOnly ? 'Role' : 'Edit role'} — ${role.name}`
              : 'Create role'}
          </DialogTitle>
          <DialogDescription>
            {scope === 'admin'
              ? 'System administrators have every permission.'
              : `${granted} of ${allKeys.length} permissions granted`}
            {!isSystemAdmin &&
              ' · You can grant only the permissions your own role has.'}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'grid gap-3',
            isSystemAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
          )}
        >
          <div className='grid gap-1.5'>
            <Label>Name</Label>
            <Input
              value={name}
              disabled={readOnly}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Slug</Label>
            <Input
              value={slug}
              disabled={readOnly}
              onChange={(e) => setSlug(e.target.value)}
              className='font-mono'
              placeholder='auto'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Scope</Label>
            {readOnly || role ? (
              <Input value={scope} disabled />
            ) : (
              <SimpleSelect
                value={scope}
                onValueChange={(v) => setScope(v as Role['scope'])}
                items={scopeOptions}
                className='w-full'
              />
            )}
          </div>
          {isSystemAdmin && (
            <div className='grid gap-1.5'>
              <Label>Airline</Label>
              <SimpleSelect
                value={airlineId}
                onValueChange={setAirlineId}
                items={[
                  { label: 'Shared (every airline)', value: SHARED },
                  ...(airlines.data ?? []),
                ]}
                className='w-full'
              />
            </div>
          )}
        </div>

        {scope !== 'admin' && (
          <div className='space-y-4'>
            {matrix.isLoading && (
              <p className='text-muted-foreground text-sm'>
                Loading permissions…
              </p>
            )}
            {groups.map((group) => {
              const groupKeys = group.menus.flatMap((m) =>
                m.permissions.map((p) => p.key)
              )
              return (
                <section
                  key={group.id ?? group.name}
                  className='overflow-x-auto rounded-md border'
                >
                  <table className='w-full min-w-[720px] table-fixed text-sm'>
                    <thead className='bg-muted/50'>
                      <tr className='text-left'>
                        <th className='px-3 py-2 font-semibold'>
                          <label className='flex items-center gap-2'>
                            <GroupCheck
                              keys={groupKeys}
                              selected={selected}
                              onChange={toggle}
                              disabled={readOnly}
                            />
                            {group.name}
                          </label>
                        </th>
                        {CRUD.map((action) => (
                          <th
                            key={action}
                            className='w-20 px-2 py-2 text-center font-medium capitalize'
                          >
                            <div className='flex flex-col items-center gap-1'>
                              {action}
                              <GroupCheck
                                keys={group.menus
                                  .map((m) => actionKey(m, action))
                                  .filter((k): k is string => !!k)}
                                selected={selected}
                                onChange={toggle}
                                disabled={readOnly}
                              />
                            </div>
                          </th>
                        ))}
                        <th className='w-60 px-2 py-2 text-left font-medium'>Other</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.menus.map((menu) => (
                        <tr key={menu.id} className='border-t'>
                          <td className='px-3 py-1.5'>
                            <label className='flex items-center gap-2'>
                              <GroupCheck
                                keys={menu.permissions.map((p) => p.key)}
                                selected={selected}
                                onChange={toggle}
                                disabled={readOnly}
                              />
                              <span
                                className={cn(
                                  !menu.is_active && 'text-muted-foreground'
                                )}
                              >
                                {menu.name}
                              </span>
                              <span className='text-muted-foreground font-mono text-[11px]'>
                                {menu.key}
                              </span>
                            </label>
                          </td>
                          {CRUD.map((action) => {
                            const key = actionKey(menu, action)
                            return (
                              <td
                                key={action}
                                className='px-2 py-1.5 text-center'
                              >
                                {key && (
                                  <Checkbox
                                    disabled={readOnly}
                                    checked={selected.has(key)}
                                    onCheckedChange={(on) =>
                                      toggle([key], on === true)
                                    }
                                  />
                                )}
                              </td>
                            )
                          })}
                          <td className='px-2 py-1.5'>
                            <div className='flex flex-wrap gap-x-3 gap-y-1'>
                              {otherActions(menu).map((p) => (
                                <label
                                  key={p.key}
                                  className='flex items-center gap-1.5 text-xs'
                                  title={p.name}
                                >
                                  <Checkbox
                                    disabled={readOnly}
                                    checked={selected.has(p.key)}
                                    onCheckedChange={(on) =>
                                      toggle([p.key], on === true)
                                    }
                                  />
                                  {p.name.split(': ').pop()}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              disabled={!name.trim() || save.isPending}
              onClick={() => save.mutate()}
            >
              Save role
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
