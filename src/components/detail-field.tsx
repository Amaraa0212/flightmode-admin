import { maskValue } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/copy-button'

export type DetailFieldVariant =
  | 'success'
  | 'error'
  | 'outline'
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'warning'

export type DetailField = {
  label: string
  value: string | number
  icon?: React.ReactNode
  mask?: boolean
  copy?: boolean
  badge?: boolean
  badgeVariant?: DetailFieldVariant
  highlight?: boolean
}

type DetailFieldProps = {
  field: DetailField
}

export function DetailFieldRenderer({ field }: DetailFieldProps) {
  return (
    <div className='flex items-start justify-between gap-4 py-3'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {field.icon && (
          <div className='text-muted-foreground shrink-0'>{field.icon}</div>
        )}
        <div className='min-w-0 flex-1'>
          <div className='text-muted-foreground mb-1 text-xs font-medium'>
            {field.label}
          </div>
          <div className='flex items-center gap-2'>
            {field.badge ? (
              <Badge
                variant={
                  field.badgeVariant || ('outline' as DetailFieldVariant)
                }
                className='capitalize'
              >
                {field.value}
              </Badge>
            ) : (
              <span
                className={`font-mono text-sm break-all ${
                  field.highlight
                    ? 'text-foreground text-base font-semibold'
                    : 'text-foreground'
                }`}
              >
                {field.mask && typeof field.value === 'string'
                  ? maskValue(field.value)
                  : field.value}
              </span>
            )}
            {field.copy && typeof field.value === 'string' && (
              <CopyButton value={field.value} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
