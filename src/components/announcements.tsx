import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { announcementFeedService, type FeedAnnouncement } from '@/services'
import { Bell, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export const ANNOUNCEMENTS_KEY = ['announcements']

function Item({
  a,
  onDismiss,
}: {
  a: FeedAnnouncement
  onDismiss: () => void
}) {
  return (
    <div className='fm-inset space-y-1 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <p className='text-sm font-semibold'>{a.title}</p>
        {a.requires_acknowledgement ? (
          <span className='shrink-0 rounded border border-amber-400/40 px-1 text-[10px] font-bold text-amber-500 uppercase'>
            Required
          </span>
        ) : (
          <button
            type='button'
            onClick={onDismiss}
            className='text-muted-foreground hover:text-foreground'
            aria-label='Dismiss'
          >
            <X className='size-3.5' />
          </button>
        )}
      </div>
      <p className='text-muted-foreground text-xs whitespace-pre-line'>
        {a.body}
      </p>
      <p className='text-muted-foreground text-[10px]'>
        {a.airline ?? 'Skythium'} ·{' '}
        {formatDate(a.created_at, 'YYYY-MM-DD HH:mm')}
      </p>
    </div>
  )
}

/** Navbar bell: what the airline tells its staff and agencies, flight changes included */
export function AnnouncementBell() {
  const queryClient = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ANNOUNCEMENTS_KEY,
    queryFn: async () => (await announcementFeedService.list()).body ?? [],
    refetchInterval: 60_000,
  })
  const dismiss = useMutation({
    mutationFn: (id: number) => announcementFeedService.dismiss(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY }),
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative size-8 rounded-full'
          aria-label='Notifications'
        >
          <Bell className='size-4' />
          {data.length > 0 && (
            <span className='absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-bold text-[#04121c]'>
              {data.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-96 space-y-2 p-3'>
        <p className='fm-label'>Notifications</p>
        {data.length ? (
          <div className='max-h-96 space-y-2 overflow-y-auto'>
            {data.map((a) => (
              <Item key={a.id} a={a} onDismiss={() => dismiss.mutate(a.id)} />
            ))}
          </div>
        ) : (
          <p className='text-muted-foreground py-6 text-center text-sm'>
            No notifications
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
