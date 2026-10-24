import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  aircraftOptions,
  airportOptions,
  flightSeriesService,
  inventoryTemplateOptions,
  type FlightSeries,
} from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useOptions } from '@/hooks/use-options'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { WEEKDAYS, pageConfig } from './config'

const schema = z.object({
  flight_number: z.string().trim().min(3),
  service_type: z.enum(['scheduled', 'charter']),
  origin: z.string().min(1, 'From is required'),
  destination: z.string().min(1, 'To is required'),
  aircraft: z.string().min(1),
  inventory_template: z.string(),
  departure_time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm'),
  arrival_time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm'),
  days_of_week: z.array(z.string()).min(1, 'Pick at least one day'),
  valid_from: z.string().min(1),
  valid_to: z.string().min(1),
})
type Form = z.infer<typeof schema>

export function SeriesDialog({
  series,
  onClose,
}: {
  series?: FlightSeries
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: series
      ? {
          ...series,
          // selects hold ids; the list shows IATA codes
          origin: String(series.origin_airport_id ?? ''),
          destination: String(series.destination_airport_id ?? ''),
          days_of_week: series.days_of_week.map(String),
        }
      : {
          flight_number: '',
          service_type: 'scheduled',
          origin: '',
          destination: '',
          aircraft: '',
          inventory_template: 'none',
          departure_time: '',
          arrival_time: '',
          days_of_week: [],
          valid_from: '',
          valid_to: '',
        },
  })
  const save = useMutation({
    mutationFn: (v: Form) => flightSeriesService.save(v, series?.id),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const registrations = useOptions('aircraft', aircraftOptions)
  const airports = useOptions('airports', airportOptions)
  const templates = useOptions('inventory-templates', inventoryTemplateOptions)

  const text = (
    name: keyof Form,
    label: string,
    props: React.ComponentProps<'input'> = {}
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={field.value as string} {...props} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
  const select = (
    name: keyof Form,
    label: string,
    items: { label: string; value: string }[]
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <SelectDropdown
            defaultValue={field.value as string}
            onValueChange={field.onChange}
            items={items}
            placeholder='Select'
          />
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {series ? 'Edit series' : 'Create frequency-based flight'}
          </DialogTitle>
          <DialogDescription>
            Flights are generated for each selected weekday in the period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='series-form'
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            className='grid grid-cols-2 gap-3'
          >
            {text('flight_number', 'Flight number', { className: 'uppercase' })}
            {select('aircraft', 'Aircraft', registrations)}
            {select('service_type', 'Type', [
              { label: 'Scheduled (хуваарьт)', value: 'scheduled' },
              { label: 'Charter (захиалгат) — free baggage', value: 'charter' },
            ])}
            {select('inventory_template', 'Seat template (new flights)', [
              { label: '— none —', value: 'none' },
              ...templates,
            ])}
            {select('origin', 'From', airports)}
            {select('destination', 'To', airports)}
            {text('departure_time', 'Departure (HH:mm)', { type: 'time' })}
            {text('arrival_time', 'Arrival (HH:mm)', { type: 'time' })}
            <FormField
              control={form.control}
              name='days_of_week'
              render={({ field }) => (
                <FormItem className='col-span-2'>
                  <FormLabel>Days</FormLabel>
                  <div className='flex gap-1.5'>
                    {WEEKDAYS.map((d, i) => {
                      const value = String(i + 1)
                      const on = field.value.includes(value)
                      return (
                        <button
                          key={d}
                          type='button'
                          onClick={() =>
                            field.onChange(
                              on
                                ? field.value.filter((x) => x !== value)
                                : [...field.value, value]
                            )
                          }
                          className={cn(
                            'h-9 w-11 rounded-md border text-sm font-semibold transition',
                            on
                              ? 'border-cyan-400 bg-cyan-400/15 text-cyan-600 dark:text-cyan-300'
                              : 'text-muted-foreground'
                          )}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {text('valid_from', 'Valid from', { type: 'date' })}
            {text('valid_to', 'Valid to', { type: 'date' })}
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='series-form' disabled={save.isPending}>
            {save.isPending && <Loader2 className='size-4 animate-spin' />}
            {series ? 'Save & regenerate' : 'Create & generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
