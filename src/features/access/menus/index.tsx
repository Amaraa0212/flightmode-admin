import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { menuService, type AdminMenu, type AdminMenuGroup } from '@/services'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { refreshProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { ROLE_SCOPE } from '@/constants/status'
import { usePagePermissions } from '@/hooks/use-page-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { menuIcon } from '@/components/layout/data/menu-icons'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { MenuDialog, type MenuDialogState } from './components/menu-dialog'

const QUERY_KEY = 'admin-menus'

type Removing =
  { kind: 'menu'; menu: AdminMenu } | { kind: 'group'; group: AdminMenuGroup }

/** Access → Menus: sidebar groups, menus and sub-menus kept in the database, and the permissions they own */
export function Menus() {
  const queryClient = useQueryClient()
  const { canCreate, canUpdate, canDelete } = usePagePermissions()
  const [dialog, setDialog] = useState<MenuDialogState | null>(null)
  const [removing, setRemoving] = useState<Removing | null>(null)
  const [groupName, setGroupName] = useState<{
    id?: number
    name: string
  } | null>(null)

  const tree = useQuery({ queryKey: [QUERY_KEY], queryFn: menuService.tree })
  const groups = tree.data ?? []

  const changed = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    queryClient.invalidateQueries({ queryKey: ['permission-matrix'] })
    refreshProfile().catch(() => null)
  }
  const onError = (error: Error) => toast.error(error.message)

  const reorder = useMutation({
    mutationFn: menuService.reorder,
    onSuccess: changed,
    onError,
  })
  const remove = useMutation({
    mutationFn: (r: Removing) =>
      r.kind === 'menu'
        ? menuService.remove(r.menu.id)
        : menuService.removeGroup(r.group.id!),
    onSuccess: (res) => {
      toast.success(res.message)
      setRemoving(null)
      changed()
    },
    onError,
  })
  const saveGroup = useMutation({
    mutationFn: (g: { id?: number; name: string; order?: number }) =>
      menuService.saveGroup(
        { name: g.name, ...(g.order !== undefined && { order: g.order }) },
        g.id
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      setGroupName(null)
      changed()
    },
    onError,
  })

  /** Swap with the neighbour and renumber the siblings 1..n */
  const move = (siblings: { id: number }[], index: number, step: -1 | 1) => {
    const ids = siblings.map((s) => s.id)
    const target = index + step
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids.map((id, i) => ({ id, order: i + 1 })))
  }
  const moveGroup = (index: number, step: -1 | 1) => {
    const real = groups.filter((g) => g.id !== null)
    const target = index + step
    if (target < 0 || target >= real.length) return
    const a = real[index]
    const b = real[target]
    saveGroup.mutate({ id: a.id!, name: a.name, order: target + 1 })
    saveGroup.mutate({ id: b.id!, name: b.name, order: index + 1 })
  }

  const renderMenu = (
    menu: AdminMenu,
    siblings: AdminMenu[],
    index: number,
    depth: number
  ) => {
    const Icon = menuIcon(menu.icon)
    return (
      <div key={menu.id}>
        <div
          className={cn(
            'hover:bg-muted/40 flex flex-wrap items-center gap-2 border-t px-3 py-2 text-sm',
            !menu.is_active && 'opacity-50'
          )}
          style={{ paddingLeft: 12 + depth * 24 }}
        >
          <span className='text-muted-foreground flex size-4 items-center'>
            {Icon && <Icon className='size-4' />}
          </span>
          <span className='font-medium'>{menu.name}</span>
          {menu.key && (
            <span className='text-muted-foreground font-mono text-xs'>
              {menu.key}
            </span>
          )}
          {menu.path && (
            <span className='text-muted-foreground font-mono text-xs'>
              {menu.path}
            </span>
          )}
          {menu.permission_key && (
            <Badge variant='outline' className='font-mono text-[10px]'>
              needs {menu.permission_key}
            </Badge>
          )}
          {menu.scopes?.map((s) => (
            <StatusChip key={s} value={s} map={ROLE_SCOPE} />
          ))}
          {!menu.is_active && <Badge variant='outline'>off</Badge>}
          <div className='flex flex-wrap gap-1'>
            {menu.permissions.map((p) => (
              <Badge
                key={p.key}
                variant='secondary'
                className='font-mono text-[10px]'
              >
                {p.action}
              </Badge>
            ))}
          </div>
          <div className='ml-auto flex items-center gap-0.5'>
            {canUpdate && (
              <>
                <Button
                  size='icon'
                  variant='ghost'
                  className='size-7'
                  onClick={() => move(siblings, index, -1)}
                >
                  <ArrowUp className='size-3.5' />
                </Button>
                <Button
                  size='icon'
                  variant='ghost'
                  className='size-7'
                  onClick={() => move(siblings, index, 1)}
                >
                  <ArrowDown className='size-3.5' />
                </Button>
              </>
            )}
            {canCreate && depth === 0 && (
              <Button
                size='sm'
                variant='ghost'
                className='h-7 gap-1 text-xs'
                onClick={() => setDialog({ parent: menu })}
              >
                <Plus className='size-3.5' /> Sub-menu
              </Button>
            )}
            {canUpdate && (
              <Button
                size='icon'
                variant='ghost'
                className='size-7'
                onClick={() => setDialog({ menu })}
              >
                <Pencil className='size-3.5' />
              </Button>
            )}
            {canDelete && !menu.is_system && (
              <Button
                size='icon'
                variant='ghost'
                className='text-destructive size-7'
                onClick={() => setRemoving({ kind: 'menu', menu })}
              >
                <Trash2 className='size-3.5' />
              </Button>
            )}
          </div>
        </div>
        {menu.children.map((child, i) =>
          renderMenu(child, menu.children, i, depth + 1)
        )}
      </div>
    )
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Menus'
        description='Sidebar groups, menus and sub-menus. Each menu key owns its permissions (view / create / update / delete and custom actions), granted to roles on the Roles page. Menus the system checks cannot be deleted — turn them off instead.'
        actions={
          canCreate && (
            <>
              <Button
                size='sm'
                variant='outline'
                className='h-8 gap-2'
                onClick={() => setGroupName({ name: '' })}
              >
                <Plus className='size-4' /> Menu group
              </Button>
              <Button
                size='sm'
                className='h-8 gap-2'
                onClick={() => setDialog({})}
              >
                <Plus className='size-4' /> Menu
              </Button>
            </>
          )
        }
      />

      {groupName && (
        <div className='flex items-center gap-2'>
          <Input
            autoFocus
            value={groupName.name}
            onChange={(e) =>
              setGroupName({ ...groupName, name: e.target.value })
            }
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              groupName.name.trim() &&
              saveGroup.mutate(groupName)
            }
            placeholder='Group name'
            className='h-8 max-w-xs'
          />
          <Button
            size='sm'
            className='h-8'
            disabled={!groupName.name.trim()}
            onClick={() => saveGroup.mutate(groupName)}
          >
            Save
          </Button>
          <Button
            size='sm'
            variant='ghost'
            className='h-8'
            onClick={() => setGroupName(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {tree.isLoading && (
        <p className='text-muted-foreground text-sm'>Loading menus…</p>
      )}

      {groups.map((group, gi) => (
        <section
          key={group.id ?? 'none'}
          className='overflow-hidden rounded-md border'
        >
          <header className='bg-muted/50 flex items-center gap-2 px-3 py-2'>
            <h3 className='text-sm font-semibold'>{group.name}</h3>
            <span className='text-muted-foreground text-xs'>
              {group.menus.length} menus
            </span>
            {group.id !== null && (
              <div className='ml-auto flex items-center gap-0.5'>
                {canUpdate && (
                  <>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='size-7'
                      onClick={() => moveGroup(gi, -1)}
                    >
                      <ArrowUp className='size-3.5' />
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='size-7'
                      onClick={() => moveGroup(gi, 1)}
                    >
                      <ArrowDown className='size-3.5' />
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='size-7'
                      onClick={() =>
                        setGroupName({ id: group.id!, name: group.name })
                      }
                    >
                      <Pencil className='size-3.5' />
                    </Button>
                  </>
                )}
                {canCreate && (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 gap-1 text-xs'
                    onClick={() => setDialog({ groupId: group.id })}
                  >
                    <Plus className='size-3.5' /> Menu
                  </Button>
                )}
                {canDelete && group.menus.length === 0 && (
                  <Button
                    size='icon'
                    variant='ghost'
                    className='text-destructive size-7'
                    onClick={() => setRemoving({ kind: 'group', group })}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                )}
              </div>
            )}
          </header>
          {group.menus.map((menu, i) => renderMenu(menu, group.menus, i, 0))}
        </section>
      ))}

      {dialog && (
        <MenuDialog
          state={dialog}
          groups={groups}
          onSaved={changed}
          onClose={() => setDialog(null)}
        />
      )}
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          title={removing.kind === 'menu' ? 'Delete menu' : 'Delete menu group'}
          desc={
            removing.kind === 'menu'
              ? `Delete "${removing.menu.name}" with its sub-menus and permissions? Roles lose them.`
              : `Delete the group "${removing.group.name}"?`
          }
          confirmText='Delete'
          destructive
          isLoading={remove.isPending}
          handleConfirm={() => remove.mutate(removing)}
        />
      )}
    </Main>
  )
}
