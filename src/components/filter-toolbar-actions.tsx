import { DataTableToolbarActions } from '@/components/data-table/toolbar-actions'
import type { FilterField, FilterValues } from '@/components/filter-panel'
import { FilterPanel } from '@/components/filter-panel'
import { useFilterHandlers } from '@/hooks/use-filter-handlers'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import type { Table } from '@tanstack/react-table'
import type { ReactNode } from 'react'

type FilterToolbarActionsProps = {
  fields: FilterField[]
  search: FilterValues & {
    start_day?: string
    end_day?: string
  }
  navigate: NavigateFn
  filterKeys: readonly string[]
  onDateRangeChange?: (range: { start_day?: string; end_day?: string }) => void
  onRefresh: () => void
  onExport?: () => void
  tableId: string
  exportFileName: string
  filterTitle?: string
  filterDescription?: string
  table?: Table<any>
  customActions?: ReactNode
}

export function FilterToolbarActions({
  fields,
  search,
  navigate,
  filterKeys,
  onDateRangeChange,
  onRefresh,
  onExport,
  tableId,
  exportFileName,
  filterTitle,
  filterDescription,
  table,
  customActions,
}: FilterToolbarActionsProps) {
  const { handleFilterChange, handleClearFilters, handleApply } = useFilterHandlers({
    navigate,
    filterKeys,
    dateRangeKeys: ['start_day', 'end_day'],
  })

  const filterValues: FilterValues = {}
  filterKeys.forEach((key) => {
    if (search[key] !== undefined) {
      filterValues[key] = search[key]
    }
  })

  return (
    <DataTableToolbarActions
      filterPanel={
        <FilterPanel
          fields={fields}
          search={filterValues}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          onApply={handleApply}
          dateRange={{
            start_day: search.start_day,
            end_day: search.end_day,
          }}
          onDateRangeChange={onDateRangeChange}
          title={filterTitle}
          description={filterDescription}
        />
      }
      onRefresh={onRefresh}
      onExport={onExport}
      table={table}
      tableId={tableId}
      exportFileName={exportFileName}
      customActions={customActions}
    />
  )
}
