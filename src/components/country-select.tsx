import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { airportService } from '@/services'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * Searchable country select; the value is the 2-letter code (MN). A value that is not in the list (an old 3-letter
 * code) is shown as it is.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder = 'Улс сонгох',
  className,
  invalid,
}: {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { data: countries = [] } = useQuery({
    queryKey: ['reference-countries'],
    queryFn: async () => (await airportService.countries()).body,
    staleTime: Infinity,
  })
  const code = (value || '').toUpperCase()
  const selected = countries.find((c) => c.alpha2.toUpperCase() === code)

  return (
    // modal: the list scrolls with the wheel inside a dialog too
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            'h-10 w-full justify-between px-3 font-normal',
            !code && 'text-muted-foreground',
            invalid && 'border-destructive',
            className
          )}
        >
          <span className='truncate'>
            {selected ? (
              <>
                <span className='font-mono'>{selected.alpha2}</span>{' '}
                <span className='text-muted-foreground'>{selected.name}</span>
              </>
            ) : (
              code || placeholder
            )}
          </span>
          <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-72 p-0' align='start'>
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.trim().toLowerCase())
              ? 1
              : 0
          }
        >
          <CommandInput placeholder='Хайх (MN, Mongolia)…' />
          <CommandList className='max-h-64'>
            <CommandEmpty>Олдсонгүй</CommandEmpty>
            <CommandGroup>
              {countries.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.alpha2} ${c.name}`}
                  onSelect={() => {
                    onChange(c.alpha2.toUpperCase())
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'size-4',
                      c.alpha2.toUpperCase() === code
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className='w-7 font-mono'>{c.alpha2}</span>
                  <span className='truncate'>{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
