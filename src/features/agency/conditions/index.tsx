import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agencyPortalService } from '@/services'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { MarkdownPreview, MarkdownToolbarEditor } from '@/components/markdown'
import { PageHeader } from '@/components/page-header'

/**
 * The agency's own conditions of carriage: printed under the e-tickets that carry the agency's details
 * (e-ticket header "Агент"); empty = the airline's conditions. The agency administrator edits them.
 */
export function AgencyConditions() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['agency-conditions'],
    queryFn: agencyPortalService.conditions,
  })
  // null = unchanged (shows the saved text)
  const [draft, setDraft] = useState<string | null>(null)
  const saved = data?.conditions_of_carriage ?? ''
  const body = draft ?? saved

  const save = useMutation({
    mutationFn: () => agencyPortalService.saveConditions(body),
    onSuccess: (res) => {
      toast.success(res.message)
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ['agency-conditions'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Тээвэрлэлтийн нөхцөл'
        description='E-ticket-ийн толгой "Агент" үед тийзний доор гарна. Хоосон бол airline-ий нөхцөл гарна.'
        actions={
          data?.can_update && (
            <Button
              size='sm'
              className='gap-2'
              disabled={body === saved || save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className='size-4' />
              Хадгалах
            </Button>
          )
        }
      />
      {!isLoading && (
        <div className='grid gap-4 lg:grid-cols-2'>
          {data?.can_update && (
            <div className='fm-panel space-y-2 p-4'>
              <p className='fm-label'>Засварлах</p>
              <MarkdownToolbarEditor
                value={body}
                onChange={setDraft}
                placeholder='# Тээвэрлэлтийн нөхцөл'
              />
              {data.updated_at && (
                <p className='text-muted-foreground text-xs'>
                  Сүүлд хадгалсан{' '}
                  {formatDate(data.updated_at, 'YYYY-MM-DD HH:mm')}
                </p>
              )}
            </div>
          )}
          <div className='fm-panel space-y-2 p-4'>
            <p className='fm-label'>Харагдах байдал</p>
            {body.trim() ? (
              <MarkdownPreview value={body} />
            ) : (
              <p className='text-muted-foreground text-sm'>
                Агентлагийн нөхцөл оруулаагүй — e-ticket дээр airline-ий
                тээвэрлэлтийн нөхцөл гарна.
              </p>
            )}
          </div>
        </div>
      )}
    </Main>
  )
}
