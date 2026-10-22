import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { serviceTemplateService, type FlightProducts as Row } from '@/services'
import { PackagePlus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ResourcePage } from '@/components/resource/resource-page'
import { SimpleSelect } from '@/components/simple-select'
import { pageConfig } from './components/config'
import { ProductsDialog } from './components/products-dialog'

const route = getRouteApi('/_authenticated/rules/flight-products/')

export function FlightProducts() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<Row | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)
  const [templateId, setTemplateId] = useState<string>()

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-template-options'],
    queryFn: async () => (await serviceTemplateService.options()).body ?? [],
  })
  const apply = useMutation({
    mutationFn: () =>
      serviceTemplateService.apply(Number(templateId), [target!.flight_id]),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      setTarget(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        onRowClick={(row) => setEditing(row)}
        customActions={(row) => (
          <div className='flex gap-1.5'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 gap-1.5 text-xs'
              onClick={(e) => {
                e.stopPropagation()
                setEditing(row)
              }}
            >
              <Pencil className='size-3.5' />
              Edit
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 gap-1.5 text-xs'
              onClick={(e) => {
                e.stopPropagation()
                setTarget(row)
              }}
            >
              <PackagePlus className='size-3.5' />
              Apply template
            </Button>
          </div>
        )}
      />
      {editing && (
        <ProductsDialog
          flight={editing}
          queryKey={pageConfig.queryKey}
          onClose={() => setEditing(null)}
        />
      )}
      {target && (
        <Dialog open onOpenChange={(open) => !open && setTarget(null)}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Apply template</DialogTitle>
              <DialogDescription>
                {target.flight_number} {target.route} — replaces the baggage and
                seat rules, the online check-in window and, for an aircraft
                template, the seat profile.
              </DialogDescription>
            </DialogHeader>
            <SimpleSelect
              value={templateId}
              onValueChange={setTemplateId}
              items={templates}
              placeholder='Select template'
              className='w-full'
            />
            <DialogFooter>
              <Button variant='outline' onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={!templateId || apply.isPending}
                onClick={() => apply.mutate()}
              >
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
