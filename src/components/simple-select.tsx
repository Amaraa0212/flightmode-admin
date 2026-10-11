import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Select outside of react-hook-form (SelectDropdown needs a Form context) */
export function SimpleSelect({
  value,
  onValueChange,
  items,
  placeholder = 'Select',
  className,
}: {
  value?: string
  onValueChange: (value: string) => void
  items: { label: string; value: string }[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className='max-h-80'>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
