import type { ColumnDef } from '@tanstack/react-table'

function columnId<TData>(column: ColumnDef<TData>): string | undefined {
  if (column.id) return column.id
  if ('accessorKey' in column && column.accessorKey != null) {
    return String(column.accessorKey)
  }
  return undefined
}

export function hasColumnId<TData>(
  columns: ColumnDef<TData>[],
  id: string
): boolean {
  return columns.some((column) => columnId(column) === id)
}

/** TanStack cell keys are `${rowId}_${columnId}` — duplicate ids crash React. */
export function uniquifyColumnIds<TData>(
  columns: ColumnDef<TData>[]
): ColumnDef<TData>[] {
  const seen = new Map<string, number>()
  return columns.map((column) => {
    const baseId = columnId(column)
    if (!baseId) return column
    const count = seen.get(baseId) ?? 0
    seen.set(baseId, count + 1)
    if (count === 0) return column
    return { ...column, id: `${baseId}_${count}` }
  })
}
