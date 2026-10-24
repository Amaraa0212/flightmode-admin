import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  inventoryService,
  inventoryTemplateOptions,
  inventoryTemplateService,
  type BaseResponse,
  type InventoryApplyResult,
} from '@/services'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useOptions } from '@/hooks/use-options'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WEEKDAYS } from './shared'

/** Per-flight outcome of a roll forward / apply template */
function ResultTable({ results }: { results: InventoryApplyResult[] }) {
  return (
    <div className='max-h-72 overflow-y-auto rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flight</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.flight_id}>
              <TableCell className='font-mono'>{r.flight_number}</TableCell>
              <TableCell className='font-mono text-xs'>
                {r.departure_local}
              </TableCell>
              <TableCell className='text-xs'>
                <span
                  className={cn(
                    'font-semibold',
                    r.status === 'applied'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {r.status === 'applied' ? 'Copied' : 'Skipped'}
                </span>
                {r.reason && (
                  <span className='text-muted-foreground'> · {r.reason}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!results.length && (
            <TableRow>
              <TableCell
                colSpan={3}
                className='text-muted-foreground h-16 text-center'
              >
                No later flight with this number in the period
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function useBatchMutation<V>(
  run: (v: V) => Promise<BaseResponse<InventoryApplyResult[]>>,
  onResults: (r: InventoryApplyResult[]) => void
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onResults(res.body ?? [])
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Copy this flight's inventory to the later flights with the same number */
export function RollForwardDialog({
  flightId,
  flightNumber,
  departureDate,
  onClose,
}: {
  flightId: number
  flightNumber: string
  departureDate: string
  onClose: () => void
}) {
  const [dateTo, setDateTo] = useState(addDays(departureDate, 30))
  const [days, setDays] = useState<number[]>([])
  const [overwrite, setOverwrite] = useState(false)
  const [results, setResults] = useState<InventoryApplyResult[] | null>(null)

  const run = useBatchMutation(
    () =>
      inventoryService.rollForward(flightId, {
        date_to: dateTo,
        days_of_week: days,
        overwrite,
      }),
    setResults
  )

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Roll forward ${flightNumber}`}
      description='Copies cabin seats and class limits to the later flights with the same number and route.'
      maxWidth='lg'
      className='p-1'
      submitButton={
        results
          ? { text: 'Done', onClick: onClose }
          : {
              text: 'Roll forward',
              onClick: () => run.mutate(undefined),
              loading: run.isPending,
              disabled: !dateTo,
            }
      }
      cancelButton={{ show: !results }}
    >
      {results ? (
        <ResultTable results={results} />
      ) : (
        <div className='grid gap-4'>
          <div className='grid gap-1.5'>
            <Label htmlFor='roll-to'>Until (departure date)</Label>
            <Input
              id='roll-to'
              type='date'
              min={departureDate}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Days of week</Label>
            <div className='flex flex-wrap gap-1.5'>
              {WEEKDAYS.map((d) => (
                <Button
                  key={d.value}
                  type='button'
                  size='sm'
                  variant={days.includes(d.value) ? 'default' : 'outline'}
                  className='h-7 w-12 text-xs'
                  aria-pressed={days.includes(d.value)}
                  onClick={() => toggleDay(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
            <p className='text-muted-foreground text-xs'>
              None selected = every day
            </p>
          </div>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={overwrite}
              onCheckedChange={(v) => setOverwrite(v === true)}
            />
            Overwrite flights that already have an inventory
          </label>
        </div>
      )}
    </BaseDialog>
  )
}

/** Apply a saved template to this flight or to every listed flight (ameliaRES "Apply Template") */
export function ApplyTemplateDialog({
  flightId,
  listedFlightIds,
  onClose,
}: {
  flightId?: number
  listedFlightIds: number[]
  onClose: () => void
}) {
  const templates = useOptions('inventory-templates', inventoryTemplateOptions)
  const [templateId, setTemplateId] = useState('')
  const [scope, setScope] = useState<'flight' | 'listed'>(
    flightId ? 'flight' : 'listed'
  )
  const [overwrite, setOverwrite] = useState(false)
  const [results, setResults] = useState<InventoryApplyResult[] | null>(null)

  const ids = scope === 'flight' && flightId ? [flightId] : listedFlightIds
  const run = useBatchMutation(
    () => inventoryService.applyTemplate(Number(templateId), ids, overwrite),
    setResults
  )

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title='Apply template'
      description='Sets cabin seats and class limits from a saved template.'
      maxWidth='lg'
      className='p-1'
      submitButton={
        results
          ? { text: 'Done', onClick: onClose }
          : {
              text: `Apply to ${ids.length} flight${ids.length === 1 ? '' : 's'}`,
              onClick: () => run.mutate(undefined),
              loading: run.isPending,
              disabled: !templateId || !ids.length,
            }
      }
      cancelButton={{ show: !results }}
    >
      {results ? (
        <ResultTable results={results} />
      ) : (
        <div className='grid gap-4'>
          <div className='grid gap-1.5'>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className='w-full'>
                <SelectValue
                  placeholder={
                    templates.length
                      ? 'Choose a template'
                      : 'No template yet — save one from a flight'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {flightId && listedFlightIds.length > 1 && (
            <div className='grid gap-1.5'>
              <Label>Flights</Label>
              <div className='flex flex-wrap gap-1.5'>
                <Button
                  type='button'
                  size='sm'
                  variant={scope === 'flight' ? 'default' : 'outline'}
                  className='h-7 text-xs'
                  onClick={() => setScope('flight')}
                >
                  This flight
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={scope === 'listed' ? 'default' : 'outline'}
                  className='h-7 text-xs'
                  onClick={() => setScope('listed')}
                >
                  All {listedFlightIds.length} listed flights
                </Button>
              </div>
            </div>
          )}
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={overwrite}
              onCheckedChange={(v) => setOverwrite(v === true)}
            />
            Overwrite flights that already have an inventory
          </label>
        </div>
      )}
    </BaseDialog>
  )
}

/** Save the current inventory of the flight as a template */
export function SaveTemplateDialog({
  flightId,
  onClose,
}: {
  flightId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const save = useMutation({
    mutationFn: () =>
      inventoryTemplateService.fromFlight(flightId, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({
        queryKey: ['options', 'inventory-templates'],
      })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'templates'] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title='Save as template'
      description='Keeps the cabin seats and class limits of this flight to apply to other flights or a flight series.'
      maxWidth='md'
      className='p-1'
      submitButton={{
        text: 'Save template',
        onClick: () => save.mutate(),
        loading: save.isPending,
        disabled: !name.trim(),
      }}
    >
      <div className='grid gap-4'>
        <div className='grid gap-1.5'>
          <Label htmlFor='template-name'>Name</Label>
          <Input
            id='template-name'
            maxLength={100}
            placeholder='B737 summer standard'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='template-description'>Description</Label>
          <Input
            id='template-description'
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </BaseDialog>
  )
}
