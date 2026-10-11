import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bagTagLayoutService, type BagTagLayout } from '@/services'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { FIELD_LABELS, pageConfig } from './config'

const SAMPLE: Record<string, string> = {
  airline_logo: '✈ OM',
  origin: 'UBN',
  destination_code: 'ICN',
  destination_city: 'SEOUL',
  flight_number: 'OM301',
  date: '29SEP',
  passenger_name: 'BAYAR/ANU',
  pnr: '4KX7QD',
  tag_number: '1289017001',
  barcode: '||| || ||| | || |||| || |',
  piece: '1/2',
  weight_kg: '21 KG',
}

export function LayoutDialog({
  layout,
  onClose,
}: {
  layout?: BagTagLayout
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(layout?.name ?? '')
  const [positions, setPositions] = useState<string[]>(
    layout?.positions ?? [
      'destination_code',
      'flight_number',
      'barcode',
      'tag_number',
      'passenger_name',
    ]
  )
  const unused = Object.keys(FIELD_LABELS).filter((f) => !positions.includes(f))

  const move = (index: number, delta: number) => {
    const next = [...positions]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    setPositions(next)
  }

  const save = useMutation({
    mutationFn: () =>
      layout
        ? bagTagLayoutService.update(layout.id, { name, positions })
        : bagTagLayoutService.create({ name, positions }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {layout ? 'Edit bag tag layout' : 'Create bag tag layout'}
          </DialogTitle>
          <DialogDescription>
            Order of fields on the printed tag. The preview uses sample data.
          </DialogDescription>
        </DialogHeader>
        <div className='grid grid-cols-[1fr_220px] gap-5'>
          <div className='space-y-3'>
            <div className='grid gap-1.5'>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Label>Positions</Label>
            <ol className='space-y-1'>
              {positions.map((field, i) => (
                <li
                  key={field}
                  className='fm-inset flex items-center gap-2 px-2.5 py-1.5 text-sm'
                >
                  <span className='text-muted-foreground w-5 font-mono text-xs'>
                    {i + 1}
                  </span>
                  <span className='flex-1'>{FIELD_LABELS[field]}</span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-6'
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className='size-3.5' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-6'
                    disabled={i === positions.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className='size-3.5' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-6'
                    onClick={() =>
                      setPositions(positions.filter((p) => p !== field))
                    }
                  >
                    <X className='size-3.5' />
                  </Button>
                </li>
              ))}
            </ol>
            <div className='flex flex-wrap gap-1.5'>
              {unused.map((field) => (
                <Button
                  key={field}
                  variant='outline'
                  size='sm'
                  className='h-7 gap-1 text-xs'
                  onClick={() => setPositions([...positions, field])}
                >
                  <Plus className='size-3' />
                  {FIELD_LABELS[field]}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className='mb-2 block'>Preview</Label>
            <div className='mx-auto flex w-[180px] flex-col items-center gap-1.5 rounded-lg border-2 border-dashed bg-white p-3 text-center font-mono text-black'>
              {positions.map((field) => (
                <div
                  key={field}
                  className={
                    field === 'destination_code'
                      ? 'text-4xl font-black'
                      : field === 'barcode'
                        ? 'text-lg tracking-tighter'
                        : 'text-xs font-semibold'
                  }
                >
                  {SAMPLE[field]}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !positions.length || save.isPending}
            onClick={() => save.mutate()}
          >
            Save layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
