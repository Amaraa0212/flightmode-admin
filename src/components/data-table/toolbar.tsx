import { useEffect, useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  debounceDelay?: number
}

function asSearchString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Filter...',
  searchKey,
  filters = [],
  debounceDelay = 500,
}: DataTableToolbarProps<TData>) {
  const searchColumn = searchKey
    ? table.getAllColumns().find((column) => column.id === searchKey)
    : undefined

  const [searchValue, setSearchValue] = useState(() =>
    asSearchString(
      searchColumn
        ? searchColumn.getFilterValue()
        : table.getState().globalFilter
    )
  )

  const debouncedSearchValue = useDebounce(searchValue, debounceDelay)
  const columnFilters = table.getState().columnFilters
  const globalFilterState = table.getState().globalFilter

  useEffect(() => {
    const column = searchKey
      ? table.getAllColumns().find((item) => item.id === searchKey)
      : undefined
    const nextValue = asSearchString(
      column ? column.getFilterValue() : globalFilterState
    )

    setSearchValue((currentValue) =>
      currentValue === nextValue ? currentValue : nextValue
    )
  }, [searchKey, table, columnFilters, globalFilterState])

  useEffect(() => {
    const column = searchKey
      ? table.getAllColumns().find((item) => item.id === searchKey)
      : undefined

    if (column) {
      const currentValue = asSearchString(column.getFilterValue())
      if (currentValue !== debouncedSearchValue) {
        column.setFilterValue(
          debouncedSearchValue === '' ? undefined : debouncedSearchValue
        )
      }
      return
    }

    if (!searchKey) {
      const currentValue = asSearchString(table.getState().globalFilter)
      if (currentValue !== debouncedSearchValue) {
        table.setGlobalFilter(
          debouncedSearchValue === '' ? undefined : debouncedSearchValue
        )
      }
    }
  }, [debouncedSearchValue, searchKey, table])

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        {searchKey !== undefined && (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className='h-8 w-[150px] lg:w-[250px]'
          />
        )}
        <div className='flex gap-x-2'>
          {filters.map((filter) => {
            const column = table
              .getAllColumns()
              .find((item) => item.id === filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
