import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { userService, type User } from '@/services'
import { ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/access/users/')

/** Organisation fields an agency administrator does not choose — the API puts new users in their agency */
const ORG_FIELDS = ['airline_id', 'airport_id', 'agency_id']

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const user = useAuthStore((s) => s.auth.user)
  const isAgency = user?.role?.scope === 'agency'
  const queryClient = useQueryClient()
  // Google Authenticator reset (lost phone) — system administrators only
  const [resetting, setResetting] = useState<User | null>(null)
  const resetTwoFactor = useMutation({
    mutationFn: (row: User) => userService.resetTwoFactor(row.id),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      setResetting(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const config = useMemo(() => {
    if (!isAgency || !pageConfig.form) return pageConfig
    return {
      ...pageConfig,
      title: 'Агентууд',
      description: `${user?.agency?.name ?? 'Agency'} — ticketing agents and administrators`,
      filters: pageConfig.filters?.filter((f) => f.columnId !== 'scope'),
      form: {
        ...pageConfig.form,
        fields: pageConfig.form.fields.filter(
          (f) => !ORG_FIELDS.includes(String(f.name))
        ),
        // a new person is a ticketing agent unless changed (role ids come from /admin/users/role-options)
        empty: { ...pageConfig.form.empty, role_id: '' },
      },
    }
  }, [isAgency, user?.agency?.name])

  return (
    <>
      <ResourcePage
        {...config}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        customActions={
          user?.is_system_admin
            ? (row) =>
                row.two_factor_enabled && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 gap-1.5 text-xs'
                    onClick={(e) => {
                      e.stopPropagation()
                      setResetting(row)
                    }}
                  >
                    <ShieldOff className='size-3.5' />
                    Reset 2FA
                  </Button>
                )
            : undefined
        }
      />
      {resetting && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setResetting(null)}
          title='Google Authenticator reset'
          desc={`"${resetting.email}" хэрэглэгчийн Google Authenticator-ыг унтраах уу? Дараагийн нэвтрэлтэд зөвхөн нууц үг асууж, хэрэглэгч дахин идэвхжүүлэх боломжтой болно.`}
          confirmText='Reset'
          destructive
          isLoading={resetTwoFactor.isPending}
          handleConfirm={() => resetTwoFactor.mutate(resetting)}
        />
      )}
    </>
  )
}
