import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService, type Role } from '@/services'
import { toast } from 'sonner'
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
import { PERMISSION_GROUPS, ROLE_SCOPE_OPTIONS, pageConfig } from './config'

export function RoleDialog({
  role,
  onClose,
}: {
  role?: Role
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const all = roleService.permissionKeys()
  const [name, setName] = useState(role?.name ?? '')
  const [slug, setSlug] = useState(role?.slug ?? '')
  const [scope, setScope] = useState<Role['scope']>(role?.scope ?? 'airline')
  const [permissions, setPermissions] = useState<string[]>(
    role?.permissions ?? []
  )

  const save = useMutation({
    mutationFn: () =>
      roleService.save(
        {
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, '_'),
          scope,
          permissions,
        },
        role?.id
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      onClose()
    },
  })

  const toggle = (key: string, on: boolean) =>
    setPermissions((prev) =>
      on ? [...prev, key] : prev.filter((p) => p !== key)
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {role ? `Edit role — ${role.name}` : 'Create role'}
          </DialogTitle>
          <DialogDescription>
            {permissions.length} of {all.length} permissions granted
          </DialogDescription>
        </DialogHeader>
        <div className='grid grid-cols-3 gap-3'>
          <div className='grid gap-1.5'>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='grid gap-1.5'>
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className='font-mono'
              placeholder='auto'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Scope</Label>
            <SimpleSelect
              value={scope}
              onValueChange={(v) => setScope(v as Role['scope'])}
              items={ROLE_SCOPE_OPTIONS}
              className='w-full'
            />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {PERMISSION_GROUPS.map((group) => {
            const keys = all.filter((k) =>
              group.prefixes.includes(k.split('.')[0])
            )
            const allOn = keys.every((k) => permissions.includes(k))
            return (
              <section key={group.title} className='fm-inset space-y-2 p-3'>
                <label className='flex items-center justify-between text-sm font-semibold'>
                  {group.title}
                  <Checkbox
                    checked={allOn}
                    onCheckedChange={(on) =>
                      setPermissions((prev) =>
                        on
                          ? [...new Set([...prev, ...keys])]
                          : prev.filter((p) => !keys.includes(p))
                      )
                    }
                  />
                </label>
                {keys.map((key) => (
                  <label
                    key={key}
                    className='flex cursor-pointer items-center gap-2 text-sm'
                  >
                    <Checkbox
                      checked={permissions.includes(key)}
                      onCheckedChange={(on) => toggle(key, on === true)}
                    />
                    <span className='font-mono text-xs'>{key}</span>
                  </label>
                ))}
              </section>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
