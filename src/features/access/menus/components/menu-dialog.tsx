import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  menuService,
  type AdminMenu,
  type AdminMenuGroup,
  type AdminMenuPayload,
  type RoleScope,
} from '@/services'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_SCOPE_OPTIONS } from '@/constants/status'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { MENU_ICONS } from '@/components/layout/data/menu-icons'
import { SimpleSelect } from '@/components/simple-select'

const NONE = 'none'
const CRUD = ['view', 'create', 'update', 'delete']
const ICON_OPTIONS = [
  { label: 'No icon', value: NONE },
  ...Object.keys(MENU_ICONS).map((name) => ({ label: name, value: name })),
]

export type MenuDialogState = {
  menu?: AdminMenu
  /** new sub-menu of this menu */
  parent?: AdminMenu
  groupId?: number | null
}

export function MenuDialog({
  state,
  groups,
  onSaved,
  onClose,
}: {
  state: MenuDialogState
  groups: AdminMenuGroup[]
  onSaved: () => void
  onClose: () => void
}) {
  const { menu, parent } = state
  const [form, setForm] = useState<AdminMenuPayload>(() => ({
    parent_id: menu?.parent_id ?? parent?.id ?? null,
    menu_group_id: menu ? menu.menu_group_id : (state.groupId ?? null),
    key: menu?.key ?? '',
    name: menu?.name ?? '',
    icon: menu?.icon ?? null,
    path: menu?.path ?? '',
    permission_key: menu?.permission_key ?? '',
    scopes: menu?.scopes ?? null,
    order: menu?.order ?? 999,
    is_active: menu?.is_active ?? true,
  }))
  const [actions, setActions] = useState<string[]>(CRUD)
  const [newAction, setNewAction] = useState('')
  const [permissions, setPermissions] = useState(menu?.permissions ?? [])
  const set = <K extends keyof AdminMenuPayload>(
    key: K,
    value: AdminMenuPayload[K]
  ) => setForm((f) => ({ ...f, [key]: value }))

  // root menus of every group, for "parent"
  const parents = groups
    .flatMap((g) => g.menus)
    .filter((m) => m.id !== menu?.id)
  const keyLocked = !!menu?.key

  const save = useMutation({
    mutationFn: () =>
      menuService.save(
        {
          ...form,
          key: form.key?.trim() || null,
          path: form.path?.trim() || null,
          permission_key: form.permission_key?.trim() || null,
          ...(!menu && form.key?.trim() && { actions }),
        },
        menu?.id
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      onSaved()
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const addAction = useMutation({
    mutationFn: (action: string) => menuService.addAction(menu!.id, { action }),
    onSuccess: (_res, action) => {
      setPermissions((p) => [
        ...p,
        {
          id: 0,
          key: `${menu!.key}.${action}`,
          action,
          name: action,
          is_system: false,
        },
      ])
      setNewAction('')
      onSaved()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const removeAction = useMutation({
    mutationFn: (permissionId: number) =>
      menuService.removeAction(menu!.id, permissionId),
    onSuccess: (_res, id) => {
      setPermissions((p) => p.filter((x) => x.id !== id))
      onSaved()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const toggleScope = (scope: RoleScope, on: boolean) => {
    const next = new Set(form.scopes ?? [])
    if (on) next.add(scope)
    else next.delete(scope)
    set('scopes', next.size ? [...next] : null)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {menu
              ? `Edit menu — ${menu.name}`
              : parent
                ? `New sub-menu of ${parent.name}`
                : 'New menu'}
          </DialogTitle>
          <DialogDescription>
            The key gives the menu its permissions: key{' '}
            <span className='font-mono'>flights</span> →{' '}
            <span className='font-mono'>flights.view</span>,{' '}
            <span className='font-mono'>flights.create</span> … A parent that
            only groups sub-menus needs no key or path.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='grid gap-1.5'>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Key</Label>
            <Input
              value={form.key ?? ''}
              disabled={keyLocked}
              onChange={(e) => set('key', e.target.value.toLowerCase())}
              className='font-mono'
              placeholder='e.g. promotions'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Path</Label>
            <Input
              value={form.path ?? ''}
              onChange={(e) => set('path', e.target.value)}
              className='font-mono'
              placeholder='/sales/promotions'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Icon</Label>
            <SimpleSelect
              value={form.icon ?? NONE}
              onValueChange={(v) => set('icon', v === NONE ? null : v)}
              items={ICON_OPTIONS}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Parent menu</Label>
            <SimpleSelect
              value={form.parent_id ? String(form.parent_id) : NONE}
              onValueChange={(v) =>
                set('parent_id', v === NONE ? null : Number(v))
              }
              items={[
                { label: 'None (top level)', value: NONE },
                ...parents.map((m) => ({ label: m.name, value: String(m.id) })),
              ]}
            />
          </div>
          {!form.parent_id && (
            <div className='grid gap-1.5'>
              <Label>Menu group</Label>
              <SimpleSelect
                value={form.menu_group_id ? String(form.menu_group_id) : NONE}
                onValueChange={(v) =>
                  set('menu_group_id', v === NONE ? null : Number(v))
                }
                items={[
                  { label: 'None', value: NONE },
                  ...groups
                    .filter((g) => g.id)
                    .map((g) => ({ label: g.name, value: String(g.id) })),
                ]}
              />
            </div>
          )}
          <div className='grid gap-1.5'>
            <Label>Visible with permission</Label>
            <Input
              value={form.permission_key ?? ''}
              onChange={(e) => set('permission_key', e.target.value)}
              className='font-mono'
              placeholder={form.key ? `${form.key}.view` : 'e.g. agency.portal'}
            />
          </div>
          <div className='flex items-end gap-2 pb-2'>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => set('is_active', v)}
            />
            <Label>Active</Label>
          </div>
        </div>

        <div className='grid gap-1.5'>
          <Label>Role scopes that see it (none = all)</Label>
          <div className='flex flex-wrap gap-4'>
            {ROLE_SCOPE_OPTIONS.map((o) => (
              <label key={o.value} className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={form.scopes?.includes(o.value as RoleScope) ?? false}
                  onCheckedChange={(on) =>
                    toggleScope(o.value as RoleScope, on === true)
                  }
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        {/* new menu: which permissions to create; existing: add / remove custom actions */}
        {!menu && form.key?.trim() && (
          <div className='grid gap-1.5'>
            <Label>Actions (permissions)</Label>
            <div className='flex flex-wrap items-center gap-2'>
              {actions.map((a) => (
                <Badge key={a} variant='secondary' className='gap-1 font-mono'>
                  {form.key}.{a}
                  <button
                    type='button'
                    onClick={() => setActions((x) => x.filter((y) => y !== a))}
                  >
                    <X className='size-3' />
                  </button>
                </Badge>
              ))}
              <ActionInput
                value={newAction}
                onChange={setNewAction}
                onAdd={() => {
                  if (newAction && !actions.includes(newAction))
                    setActions((x) => [...x, newAction])
                  setNewAction('')
                }}
              />
            </div>
          </div>
        )}
        {menu?.key && (
          <div className='grid gap-1.5'>
            <Label>Actions (permissions)</Label>
            <div className='flex flex-wrap items-center gap-2'>
              {permissions.map((p) => (
                <Badge
                  key={p.key}
                  variant='secondary'
                  className='gap-1 font-mono'
                >
                  {p.key}
                  {!p.is_system && p.id > 0 && (
                    <button
                      type='button'
                      onClick={() => removeAction.mutate(p.id)}
                    >
                      <X className='size-3' />
                    </button>
                  )}
                </Badge>
              ))}
              <ActionInput
                value={newAction}
                onChange={setNewAction}
                onAdd={() => newAction && addAction.mutate(newAction)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!form.name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Save menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActionInput({
  value,
  onChange,
  onAdd,
}: {
  value: string
  onChange: (value: string) => void
  onAdd: () => void
}) {
  return (
    <div className='flex items-center gap-1'>
      <Input
        value={value}
        onChange={(e) =>
          onChange(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))
        }
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        className='h-7 w-32 font-mono text-xs'
        placeholder='export'
      />
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='h-7'
        onClick={onAdd}
      >
        Add
      </Button>
    </div>
  )
}
