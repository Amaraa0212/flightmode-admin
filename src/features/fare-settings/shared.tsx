import type { ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BaseResponse } from '@/services'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'

export const CABIN_OPTIONS = [
  { label: 'F - First', value: 'F' },
  { label: 'C - Business', value: 'C' },
  { label: 'W - Premium economy', value: 'W' },
  { label: 'Y - Economy', value: 'Y' },
]
export const PAX_OPTIONS = [
  { label: 'ADT - Adult', value: 'ADT' },
  { label: 'CHD - Child', value: 'CHD' },
  { label: 'INF - Infant', value: 'INF' },
]
export const BOUND_OPTIONS = [
  { label: 'OUT - departing the airport', value: 'OUT' },
  { label: 'IN - arriving at the airport', value: 'IN' },
]

/** Card with a title row, like the legacy fare settings screens */
export function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className='fm-panel overflow-hidden'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3'>
        <div>
          <p className='text-sm font-semibold'>{title}</p>
          {subtitle && (
            <p className='text-muted-foreground text-xs'>{subtitle}</p>
          )}
        </div>
        {actions && <div className='flex items-center gap-2'>{actions}</div>}
      </div>
      <div className='overflow-x-auto'>{children}</div>
    </div>
  )
}

/** Y / N flag cell */
export function YN({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        'font-mono text-xs font-semibold',
        value
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground'
      )}
    >
      {value ? 'Y' : 'N'}
    </span>
  )
}

export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className='text-muted-foreground h-20 text-center'
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

export function RowActions({
  onEdit,
  onDelete,
  children,
}: {
  onEdit?: () => void
  onDelete?: () => void
  children?: ReactNode
}) {
  return (
    <div
      className='flex items-center justify-end gap-1'
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      {onEdit && (
        <Button
          variant='ghost'
          size='icon'
          className='size-8'
          onClick={onEdit}
          aria-label='Edit'
        >
          <Pencil className='size-4' />
        </Button>
      )}
      {onDelete && (
        <Button
          variant='ghost'
          size='icon'
          className='size-8 text-red-500'
          onClick={onDelete}
          aria-label='Delete'
        >
          <Trash2 className='size-4' />
        </Button>
      )}
    </div>
  )
}

export const money = (
  value: string | number | null | undefined,
  currency = 'MNT'
) =>
  value === null || value === undefined
    ? '-'
    : `${Number(value).toLocaleString('en-US')} ${currency}`

/** Mutation that toasts and refreshes the fare setting queries */
export function useFareMutation<V>(
  run: (v: V) => Promise<BaseResponse<unknown>>,
  onDone?: () => void
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['fare-settings'] })
      queryClient.invalidateQueries({ queryKey: ['options'] })
      onDone?.()
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

/** Delete confirm; when `blocked` is set it only explains why the row cannot be deleted (legacy behaviour). */
export function DeleteDialog({
  label,
  blocked,
  onConfirm,
  onClose,
  isLoading,
}: {
  label: string
  blocked?: string
  onConfirm: () => void
  onClose: () => void
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={blocked ? `${label} cannot be deleted` : `Delete ${label}`}
      desc={blocked ?? `Delete "${label}"? This cannot be undone.`}
      confirmText={blocked ? 'OK' : 'Delete'}
      destructive={!blocked}
      isLoading={isLoading}
      handleConfirm={blocked ? onClose : onConfirm}
    />
  )
}
