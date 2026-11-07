import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { bagTagService } from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePagePermissions } from '@/hooks/use-page-permissions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'

const route = getRouteApi('/_authenticated/rules/bag-tag/')

const QUERY_KEY = ['admin-bag-tag-airlines']
const DIRECTIONS = [0, 180] as const

/** Simplified bag tag: shows which way up the tag comes out of the printer */
function TagPreview({ rotation }: { rotation: 0 | 180 }) {
  return (
    <div
      className='bg-background text-foreground mx-auto flex h-40 w-16 flex-col items-center justify-between rounded border p-1.5 transition-transform'
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span className='text-[10px] font-bold'>LOGO</span>
      <span className='font-mono text-lg font-bold'>ICN</span>
      <div className='h-8 w-full bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_4px)]' />
    </div>
  )
}

/** Rules → Bag Tag Orientation: 0° or 180°, per airline. The DCS prints the airline's tags this way. */
export function BagTagPosition() {
  const { airline } = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const { canUpdate } = usePagePermissions()

  const { data: airlines = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await bagTagService.airlines()).body,
  })
  // an airline user gets only their own airline here; a system administrator picks one
  const current = airlines.find((a) => a.id === airline) ?? airlines[0]

  const save = useMutation({
    mutationFn: (rotation: 0 | 180) => bagTagService.save(current.id, rotation),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Bag Tag Orientation'
        description='Which way the bag tag prints: 0° as designed, 180° upside down'
        actions={
          airlines.length > 1 && (
            <Select
              value={current ? String(current.id) : ''}
              onValueChange={(v) =>
                navigate({ search: { airline: Number(v) } })
              }
            >
              <SelectTrigger className='h-9 w-64'>
                <SelectValue placeholder='Airline' />
              </SelectTrigger>
              <SelectContent>
                {airlines.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.iata_code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {isLoading || !current ? (
        <div className='text-muted-foreground flex justify-center py-10'>
          <Loader2 className='size-5 animate-spin' />
        </div>
      ) : (
        <div className='grid max-w-xl grid-cols-2 gap-4'>
          {DIRECTIONS.map((rotation) => (
            <button
              key={rotation}
              type='button'
              disabled={!canUpdate || save.isPending}
              aria-pressed={current.bag_tag_rotation === rotation}
              onClick={() => save.mutate(rotation)}
              className={cn(
                'bg-card grid gap-3 rounded-xl border p-4 text-center transition-colors disabled:cursor-not-allowed',
                current.bag_tag_rotation === rotation
                  ? 'border-brand ring-brand ring-1'
                  : 'hover:bg-muted/50'
              )}
            >
              <TagPreview rotation={rotation} />
              <span className='text-lg font-semibold'>{rotation}°</span>
            </button>
          ))}
        </div>
      )}
    </Main>
  )
}
