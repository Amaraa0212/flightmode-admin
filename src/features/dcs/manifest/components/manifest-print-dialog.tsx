import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { flightPassengerService } from '@/services'
import { Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { printDocument } from '@/lib/manifest/print'
import { manifestDocument, type ManifestOptions } from '@/lib/manifest/template'
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

type Report = 'balance' | 'passengers' | 'baggage'

/** The DCS counter's reports and default copies (3 / 5 / 5) */
const REPORTS: { id: Report; label: string }[] = [
  { id: 'balance', label: 'W&B Report' },
  { id: 'passengers', label: 'Passenger Manifest' },
  { id: 'baggage', label: 'Baggage Manifest' },
]

/**
 * Print from the admin, the same documents as the DCS counter's "Manifest": W&B seat map / load, passenger and
 * baggage manifests of the checked-in passengers, each the chosen number of times, in one print job.
 */
export function ManifestPrintDialog({
  flightId,
  flightNumber,
  open,
  onOpenChange,
}: {
  flightId: number
  flightNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [checked, setChecked] = useState<Record<Report, boolean>>({
    balance: true,
    passengers: true,
    baggage: true,
  })
  const [copies, setCopies] = useState<Record<Report, string>>({
    balance: '3',
    passengers: '5',
    baggage: '5',
  })
  const [preparedBy, setPreparedBy] = useState('')

  const count = (id: Report) =>
    checked[id] ? Math.max(0, Math.min(20, Number(copies[id]) || 0)) : 0

  const print = useMutation({
    mutationFn: async () => {
      const { manifest, seatMap } = await flightPassengerService.manifestPrint(flightId)
      const options: ManifestOptions = {
        balance: count('balance'),
        passengers: count('passengers'),
        baggage: count('baggage'),
        preparedBy,
      }
      printDocument(manifestDocument(manifest, seatMap, options))
    },
    onSuccess: () => onOpenChange(false),
    onError: (error: Error) => toast.error(error.message),
  })

  const nothing = REPORTS.every((r) => count(r.id) === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Are you sure to print manifest?</DialogTitle>
          <DialogDescription>
            {flightNumber} · checked-in passengers · copies of each report
          </DialogDescription>
        </DialogHeader>

        <form
          id='admin-manifest-print'
          className='grid gap-3'
          onSubmit={(e) => {
            e.preventDefault()
            if (!nothing) print.mutate()
          }}
        >
          {REPORTS.map((r) => (
            <div key={r.id} className='flex items-center gap-3'>
              <label className='flex flex-1 cursor-pointer items-center gap-2 text-sm'>
                <Checkbox
                  checked={checked[r.id]}
                  onCheckedChange={(v) =>
                    setChecked((s) => ({ ...s, [r.id]: v === true }))
                  }
                />
                {r.label}
              </label>
              <Input
                type='number'
                min={1}
                max={20}
                aria-label={`${r.label} copies`}
                disabled={!checked[r.id]}
                value={copies[r.id]}
                onChange={(e) =>
                  setCopies((s) => ({ ...s, [r.id]: e.target.value }))
                }
                className='h-8 w-16 font-mono'
              />
            </div>
          ))}
          <label className='grid gap-1 text-xs'>
            <span className='text-muted-foreground'>Үйлдсэн (prepared by)</span>
            <Input
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className='h-9 uppercase'
            />
          </label>
        </form>

        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            No
          </Button>
          <Button
            type='submit'
            form='admin-manifest-print'
            className='gap-2'
            disabled={nothing || print.isPending}
          >
            {print.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Printer className='size-4' />
            )}
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
