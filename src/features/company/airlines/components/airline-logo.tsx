import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { airlineService, type Airline } from '@/services'
import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * The airline's logo — printed on the e-ticket, boarding pass and bag tag (grayscale on the tag). A wide logo
 * prints best: the bag tag gives it a 4.1 cm wide box. Without one the airline's name is printed instead.
 * An SVG must be a plain drawing (the API refuses scripts and outside links); text converted to outlines prints best.
 */
export function AirlineLogo({ airline, queryKey }: { airline: Airline; queryKey: string }) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const done = (res: { message?: string }) => {
    toast.success(res.message ?? 'Saved')
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  }
  const upload = useMutation({
    mutationFn: (file: File) => airlineService.uploadLogo(airline.id, file),
    onSuccess: done,
    onError: (error: Error) => toast.error(error.message),
  })
  const remove = useMutation({
    mutationFn: () => airlineService.removeLogo(airline.id),
    onSuccess: done,
    onError: (error: Error) => toast.error(error.message),
  })
  const busy = upload.isPending || remove.isPending

  return (
    <div className='flex items-center gap-1.5' onClick={(e) => e.stopPropagation()}>
      {airline.logo_url ? (
        <img
          src={airline.logo_url}
          alt={`${airline.name} logo`}
          className='h-7 max-w-24 rounded border bg-white object-contain p-0.5'
        />
      ) : (
        <span className='text-muted-foreground text-xs'>No logo</span>
      )}
      <input
        ref={input}
        type='file'
        accept='image/png,image/jpeg,image/webp,image/svg+xml,.svg'
        className='hidden'
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) upload.mutate(file)
        }}
      />
      <Button
        size='icon'
        variant='ghost'
        className='size-7'
        title='Upload logo (SVG / PNG / JPG / WEBP, up to 2 MB)'
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {upload.isPending ? <Loader2 className='size-3.5 animate-spin' /> : <ImageUp className='size-3.5' />}
      </Button>
      {airline.logo_url && (
        <Button
          size='icon'
          variant='ghost'
          className='text-destructive size-7'
          title='Remove logo'
          disabled={busy}
          onClick={() => remove.mutate()}
        >
          <Trash2 className='size-3.5' />
        </Button>
      )}
    </div>
  )
}
