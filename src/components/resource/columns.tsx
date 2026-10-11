import type { ReactNode } from 'react'
import type { Column, ColumnDef } from '@tanstack/react-table'
import { cn, formatDate } from '@/lib/utils'
import type { StatusMeta } from '@/constants/status'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusChip } from '@/components/status-chip'

type ColOptions<T> = {
  /** Value used by faceted filters / export */
  accessor?: (row: T) => unknown
  className?: string
}

/** Short column definition: col('pnr', 'PNR', (r) => r.pnr) */
export function col<T>(
  id: string,
  title: string,
  cell: (row: T) => ReactNode,
  options: ColOptions<T> = {}
): ColumnDef<T> {
  return {
    id,
    accessorFn:
      options.accessor ?? ((row) => (row as Record<string, unknown>)[id]),
    header: ({ column }: { column: Column<T> }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => (
      <div className={cn('ps-2', options.className)}>{cell(row.original)}</div>
    ),
    enableSorting: false,
  }
}

export const mono = (value: ReactNode, className?: string) => (
  <span className={cn('font-mono text-xs', className)}>{value ?? '-'}</span>
)

export const brand = (value: ReactNode) => (
  <span className='text-brand font-mono text-xs font-semibold'>
    {value ?? '-'}
  </span>
)

export const dateTime = (
  iso: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm'
) =>
  iso ? (
    <span className='text-xs text-nowrap'>{formatDate(iso, format)}</span>
  ) : (
    '-'
  )

export const chip = (
  value: string | null | undefined,
  map: Record<string, StatusMeta>
) => <StatusChip value={value} map={map} />

export const money = (value: number | null | undefined, currency = '₮') =>
  value === null || value === undefined ? (
    '-'
  ) : (
    <span className='font-mono text-xs text-nowrap'>
      {Math.round(value).toLocaleString('en-US')} {currency}
    </span>
  )

export const muted = (value: ReactNode) => (
  <span className='text-muted-foreground text-xs'>{value ?? '-'}</span>
)
