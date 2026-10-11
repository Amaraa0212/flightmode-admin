import { Button } from '@/components/ui/button'
import { exportTable } from '@/utils/table-export'
import type { Table } from '@tanstack/react-table'
import { Download, Loader2, RotateCcw } from 'lucide-react'
import { type ReactNode, useState } from 'react'

type ToolbarActionsProps<TData = unknown> = {
  filterPanel?: ReactNode
  onRefresh?: () => void
  onExport?: () => void
  table?: Table<TData>
  tableId?: string
  exportFileName?: string
  customActions?: ReactNode
}

export function DataTableToolbarActions<TData = unknown>({
  filterPanel,
  onRefresh,
  onExport,
  table,
  tableId,
  exportFileName,
  customActions,
}: ToolbarActionsProps<TData>) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Prefer custom onExport callback if provided
      if (onExport) {
        await Promise.resolve(onExport())
        return
      }

      // Fallback to table instance export if available
      if (table && exportFileName) {
        const format = exportFileName.endsWith('.xlsx') ? 'excel' : 'csv'
        await exportTable<any>(table, exportFileName, format)
        return
      }

      // Fallback to tableId if table instance is not available
      if (!exportFileName || !tableId) {
        return
      }

      const tableElement = document.getElementById(tableId)
      if (tableElement) {
        // TODO: Implement fallback export using tableElement
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const hasActions =
    filterPanel ||
    onRefresh ||
    onExport ||
    (exportFileName && (table || tableId)) ||
    customActions

  if (!hasActions) return null

  return (
    <div className='flex items-center gap-2'>
      {filterPanel}
      {customActions}
      {onRefresh && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onRefresh}
          className='h-8 gap-2'
        >
          <RotateCcw className='h-4 w-4' />
          Refresh
        </Button>
      )}
      {(onExport || (exportFileName && (table || tableId))) && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleExport}
          disabled={isExporting}
          className='h-8 gap-2'
        >
          {isExporting ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Download className='h-4 w-4' />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      )}
    </div>
  )
}
