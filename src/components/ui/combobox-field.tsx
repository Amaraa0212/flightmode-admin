import { useEffect, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { FormFieldConfig } from './config-form-dialog'

export function ComboboxField<TFormData extends Record<string, unknown>>({
  field,
  form,
}: {
  field: FormFieldConfig<TFormData>
  form: UseFormReturn<TFormData>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [options, setOptions] = useState<
    Array<{ value: string; label: string; image?: string; key?: string }>
  >([])
  const [loading, setLoading] = useState(false)

  const currentValue = form.watch(field.name as any) as string | undefined

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [search])

  // Fetch options on mount and when debounced search changes
  useEffect(() => {
    if (!field.comboboxOptions?.fetchOptions) return

    const fetchOptions = async () => {
      setLoading(true)
      try {
        const fetchedOptions = await field.comboboxOptions!.fetchOptions(
          debouncedSearch || undefined
        )
        setOptions(fetchedOptions)
      } catch (error) {
        console.error('Failed to fetch combobox options:', error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [debouncedSearch, field.comboboxOptions?.fetchOptions])

  const selectedOption = options.find((opt) => opt.value === currentValue)
  const isDisabled = field.disabled

  return (
    <FormField
      control={form.control}
      name={field.name as any}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && ' *'}
          </FormLabel>
          <Popover
            open={isDisabled ? false : open}
            onOpenChange={(nextOpen) => {
              if (isDisabled) return
              setOpen(nextOpen)
            }}
          >
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant='outline'
                  role='combobox'
                  className={cn(
                    'w-full justify-between',
                    !currentValue && 'text-muted-foreground'
                  )}
                  type='button'
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return
                    setOpen((prev) => !prev)
                  }}
                >
                  <div className='flex items-center gap-2'>
                    {selectedOption?.image && (
                      <img
                        src={selectedOption.image}
                        alt=''
                        className='h-4 w-4 rounded-full'
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                    <span>
                      {selectedOption
                        ? selectedOption.label
                        : field.placeholder || 'Select...'}
                    </span>
                  </div>
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </FormControl>
            </PopoverTrigger>
            {!isDisabled && (
              <PopoverContent
                className='w-[var(--radix-popover-trigger-width)] p-0'
                align='start'
                onInteractOutside={(e) => {
                  e.preventDefault()
                }}
              >
                <Command>
                  <CommandInput
                    placeholder={
                      field.comboboxOptions?.placeholder || 'Search...'
                    }
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    {loading ? (
                      <div className='text-muted-foreground py-6 text-center text-sm'>
                        Loading...
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                          {options.map((option) => (
                            <CommandItem
                              key={option.key || option.value}
                              // Use both label and value for filtering so typing email matches results
                              value={`${option.label} ${option.value}`}
                              onSelect={() => {
                                formField.onChange(option.value as any)
                                if (field.comboboxOptions?.onSelect) {
                                  field.comboboxOptions.onSelect(
                                    option.value,
                                    option.image,
                                    form
                                  )
                                }
                                setOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  currentValue === option.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className='flex items-center gap-2'>
                                {option.image && (
                                  <img
                                    src={option.image}
                                    alt=''
                                    className='h-5 w-5 rounded-full'
                                    onError={(e) => {
                                      ;(
                                        e.target as HTMLImageElement
                                      ).style.display = 'none'
                                    }}
                                  />
                                )}
                                <span>{option.label}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            )}
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
