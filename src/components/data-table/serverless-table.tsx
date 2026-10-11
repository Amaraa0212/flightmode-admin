import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import type {
  CreateDialogProps,
  DeleteDialogProps,
  DetailDialogProps,
  UpdateDialogProps,
} from '@/lib/dialog-types'
import { cn } from '@/lib/utils'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '../ui/skeleton'
import type { ToolbarConfig } from './base-table'
import { ServerlessPagination } from './serverless-pagination'
import { DataTableToolbar } from './toolbar'
import { DataTableToolbarActions } from './toolbar-actions'
import { hasColumnId, uniquifyColumnIds } from './unique-columns'

export interface ServerlessTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  search: Record<string, unknown>
  navigate: NavigateFn
  CreateComponent?: React.ComponentType<CreateDialogProps>
  UpdateComponent?: React.ComponentType<UpdateDialogProps<TData>>
  DeleteComponent?: React.ComponentType<DeleteDialogProps<TData>>
  DetailComponent?: React.ComponentType<DetailDialogProps<TData>>
  hideAction?: boolean
  customActions?: (record: TData) => ReactNode
  hideEditButton?: (record: TData) => boolean
  hideDeleteButton?: (record: TData) => boolean
  showDetailButton?: (record: TData) => boolean
  toolbar?: ToolbarConfig
  hideToolbar?: boolean
  enableRowSelection?: boolean
  tableId?: string
  header?: ReactNode
  renderBeforeTable?: ReactNode
  emptyState?: ReactNode
  onRefresh?: () => void
  onUpdate?: (record: TData) => void
  onDelete?: (record: TData) => void
  onDetail?: (record: TData) => void
  rowKey?: keyof TData | ((record: TData) => string | number)
  className?: string
  isLoading?: boolean
  // Serverless pagination specific props (DynamoDB)
  hasNextPage: boolean
  currentPage: number
  onNextPage: () => void
  onPreviousPage: () => void
  total?: number
}

function RowActions<TData>({
  record,
  onEdit,
  onDelete,
  onDetail,
  hideEditButton,
  hideDeleteButton,
  showDetailButton,
  customActions,
}: {
  record: TData
  onEdit?: () => void
  onDelete?: () => void
  onDetail?: () => void
  hideEditButton?: (record: TData) => boolean
  hideDeleteButton?: (record: TData) => boolean
  showDetailButton?: (record: TData) => boolean
  customActions?: (record: TData) => ReactNode
}) {
  const canEdit = !hideEditButton || !hideEditButton(record)
  const canDelete = !hideDeleteButton || !hideDeleteButton(record)
  const canDetail = !showDetailButton || showDetailButton(record)
  const hasActions = onDetail || onEdit || onDelete || customActions

  if (!hasActions) return null

  return (
    <div className='flex items-center justify-end gap-1.5'>
      {onDetail && (
        <button
          type='button'
          onClick={onDetail}
          disabled={!canDetail}
          className={cn(
            'group relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-all duration-200',
            'text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-primary',
            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            !canDetail && 'cursor-not-allowed opacity-50'
          )}
          title='View details'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='transition-transform duration-200 group-hover:scale-110'
          >
            <path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' />
            <circle cx='12' cy='12' r='3' />
          </svg>
        </button>
      )}
      {onEdit && (
        <button
          type='button'
          onClick={onEdit}
          disabled={!canEdit}
          className={cn(
            'group relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-all duration-200',
            'text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-primary',
            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            'active:scale-95',
            !canEdit && 'cursor-not-allowed opacity-50'
          )}
          title='Edit'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='transition-transform duration-200 group-hover:scale-110'
          >
            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          type='button'
          onClick={onDelete}
          disabled={!canDelete}
          className={cn(
            'group relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-all duration-200',
            'text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700',
            'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none',
            'active:scale-95',
            !canDelete && 'cursor-not-allowed opacity-50'
          )}
          title='Delete'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='transition-transform duration-200 group-hover:scale-110'
          >
            <path d='M3 6h18' />
            <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
            <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
          </svg>
        </button>
      )}
      {customActions && customActions(record)}
    </div>
  )
}

export function ServerlessTable<TData extends Record<string, unknown>>({
  data,
  columns,
  CreateComponent,
  UpdateComponent,
  DeleteComponent,
  DetailComponent,
  hideAction = false,
  customActions,
  hideEditButton,
  hideDeleteButton,
  showDetailButton,
  toolbar,
  hideToolbar = false,
  enableRowSelection = true,
  tableId,
  header,
  renderBeforeTable,
  emptyState,
  onRefresh,
  onUpdate,
  onDelete,
  onDetail,
  rowKey = 'id' as keyof TData,
  className,
  isLoading = false,
  hasNextPage,
  currentPage,
  onNextPage,
  onPreviousPage,
  total,
}: ServerlessTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [updateRecord, setUpdateRecord] = useState<TData | undefined>()
  const [deleteRecord, setDeleteRecord] = useState<TData | undefined>()
  const [detailRecord, setDetailRecord] = useState<TData | undefined>()

  const hasActionsColumn = hasColumnId(columns, 'actions')

  const tableColumns: ColumnDef<TData>[] = uniquifyColumnIds([
    ...columns,
    ...(hideAction || hasActionsColumn
      ? []
      : [
          {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
              <RowActions
                record={row.original}
                onEdit={
                  UpdateComponent || onUpdate
                    ? () => {
                        setUpdateRecord(row.original)
                        onUpdate?.(row.original)
                      }
                    : undefined
                }
                onDelete={
                  DeleteComponent || onDelete
                    ? () => {
                        setDeleteRecord(row.original)
                        onDelete?.(row.original)
                      }
                    : undefined
                }
                onDetail={
                  DetailComponent || onDetail
                    ? () => {
                        setDetailRecord(row.original)
                        onDetail?.(row.original)
                      }
                    : undefined
                }
                hideEditButton={hideEditButton}
                hideDeleteButton={hideDeleteButton}
                showDetailButton={showDetailButton}
                customActions={customActions}
              />
            ),
            enableSorting: false,
          } as ColumnDef<TData>,
        ]),
  ])

  const table = useReactTable<TData>({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row, index) => {
      const raw =
        typeof rowKey === 'function'
          ? String(rowKey(row))
          : String(row[rowKey] ?? '')
      return raw || `row-${index}`
    },
    manualPagination: true,
    manualFiltering: true,
  })

  return (
    <div className={cn('flex flex-1 flex-col gap-4', className)}>
      {header}

      {!hideToolbar && toolbar && (
        <div className='flex items-center justify-between gap-4'>
          <DataTableToolbar
            table={table}
            searchPlaceholder={toolbar.searchPlaceholder || 'Filter...'}
            searchKey={toolbar.searchKey}
            filters={toolbar.filters}
            debounceDelay={toolbar.debounceDelay}
          />
          <div className='flex items-center gap-2'>
            {toolbar.exportFileName && (
              <DataTableToolbarActions
                table={table}
                exportFileName={toolbar.exportFileName}
              />
            )}
            {typeof toolbar.extra === 'function'
              ? toolbar.extra(table)
              : toolbar.extra}
          </div>
        </div>
      )}

      {renderBeforeTable}

      <div className='overflow-hidden rounded-md border'>
        <Table id={tableId}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        header.column.columnDef.meta?.className,
                        (header.column.columnDef.meta as any)?.thClassName
                      )}
                      style={{
                        width:
                          header.getSize() !== 150
                            ? header.getSize()
                            : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {tableColumns.map((_, colIndex) => (
                    <TableCell
                      key={`skeleton-${index}-${colIndex}`}
                      className='bg-background'
                    >
                      <Skeleton className='h-4 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        (cell.column.columnDef.meta as any)?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className='h-24 text-center'
                >
                  {emptyState || 'No data available.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ServerlessPagination
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        total={total}
        className='mt-auto'
      />

      {CreateComponent && (
        <CreateComponent
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false)
          }}
        />
      )}

      {UpdateComponent && updateRecord && (
        <UpdateComponent
          open={!!updateRecord}
          onClose={() => setUpdateRecord(undefined)}
          onSuccess={() => {
            setUpdateRecord(undefined)
          }}
          data={updateRecord}
        />
      )}

      {DeleteComponent && deleteRecord && (
        <DeleteComponent
          open={!!deleteRecord}
          onClose={() => setDeleteRecord(undefined)}
          onSuccess={() => {
            setDeleteRecord(undefined)
            onRefresh?.()
          }}
          data={deleteRecord}
        />
      )}

      {DetailComponent && detailRecord && (
        <DetailComponent
          open={!!detailRecord}
          onClose={() => setDetailRecord(undefined)}
          onSuccess={() => setDetailRecord(undefined)}
          data={detailRecord}
        />
      )}
    </div>
  )
}
