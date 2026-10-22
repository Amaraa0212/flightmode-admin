import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { carriageService } from '@/services'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { MarkdownPreview, MarkdownToolbarEditor } from '@/components/markdown'
import { PageHeader } from '@/components/page-header'

const route = getRouteApi('/_authenticated/inventory/carriage/')

export function Carriage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const { data: docs = [] } = useQuery({
    queryKey: ['admin-carriage'],
    queryFn: async () => (await carriageService.list()).body ?? [],
  })
  const airlineId = search.airline ?? docs[0]?.airline_id
  const doc = docs.find((d) => d.airline_id === airlineId)
  // Draft per airline; null = unchanged (shows the saved text)
  const [draft, setDraft] = useState<{ airline?: number; body: string } | null>(
    null
  )
  const body =
    draft && draft.airline === airlineId ? draft.body : (doc?.body ?? '')
  const setBody = (value: string) =>
    setDraft({ airline: airlineId, body: value })

  const save = useMutation({
    mutationFn: async () => carriageService.save(airlineId!, body),
    onSuccess: (res) => {
      toast.success(res.message)
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ['admin-carriage'] })
    },
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Conditions of carriage'
        description='Each airline edits its own conditions — shown on the e-ticket and in the agency portal'
        actions={
          <Button
            size='sm'
            className='gap-2'
            disabled={!doc || body === doc.body || save.isPending}
            onClick={() => save.mutate()}
          >
            <Save className='size-4' />
            Save
          </Button>
        }
      />
      <Tabs
        value={String(airlineId ?? '')}
        onValueChange={(v) => navigate({ search: { airline: Number(v) } })}
      >
        <TabsList>
          {docs.map((d) => (
            <TabsTrigger key={d.airline_id} value={String(d.airline_id)}>
              {d.airline}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {doc && (
        <div className='grid grid-cols-2 gap-4'>
          <div className='fm-panel space-y-2 p-4'>
            <p className='fm-label'>Editor</p>
            <MarkdownToolbarEditor
              value={body}
              onChange={setBody}
              placeholder='# Conditions of carriage'
            />
            {doc.updated_at && (
              <p className='text-muted-foreground text-xs'>
                Last saved {formatDate(doc.updated_at, 'YYYY-MM-DD HH:mm')}
              </p>
            )}
          </div>
          <div className='fm-panel space-y-2 p-4'>
            <p className='fm-label'>Preview</p>
            <MarkdownPreview value={body} />
          </div>
        </div>
      )}
    </Main>
  )
}
