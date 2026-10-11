import { useMemo, useState, type ReactNode } from 'react'
import type { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { BaseResponse, PaginationResponse } from '@/services'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useFilterParams } from '@/hooks/use-filter-params'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BaseTable, TableHeader } from '@/components/data-table'
import { Main } from '@/components/layout/main'

type FilterConfig = {
  columnId: string
  title: string
  options: { label: string; value: string }[]
}

export type ResourceFormConfig<TRow, TForm extends Record<string, unknown>> = {
  /** "airport" → "Create airport" / "Edit airport" */
  entity: string
  schema: z.ZodSchema<TForm>
  fields: FormFieldConfig<TForm>[]
  empty: TForm
  fromRow: (row: TRow) => TForm
  create?: (values: TForm) => Promise<BaseResponse<unknown>>
  update?: (row: TRow, values: TForm) => Promise<BaseResponse<unknown>>
  description?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

export type ResourcePageProps<
  TRow extends Record<string, unknown>,
  TForm extends Record<string, unknown> = Record<string, unknown>,
> = {
  title: string
  description?: string
  queryKey: string
  search: Record<string, unknown>
  navigate: NavigateFn
  list: (
    params: Record<string, unknown>
  ) => Promise<BaseResponse<PaginationResponse<TRow>>>
  columns: ColumnDef<TRow>[]
  searchPlaceholder?: string
  filters?: FilterConfig[]
  form?: ResourceFormConfig<TRow, TForm>
  remove?: {
    run: (row: TRow) => Promise<BaseResponse<unknown>>
    label: (row: TRow) => string
  }
  onRowClick?: (row: TRow) => void
  rowKey?: keyof TRow | ((row: TRow) => string | number)
  customActions?: (row: TRow) => ReactNode
  toolbarExtra?: ReactNode
  beforeTable?: ReactNode
  exportFileName?: string
  /** Extra params merged into the list request (e.g. selected aircraft) */
  params?: Record<string, unknown>
  defaultPageSize?: number
  /** Render only the table (inside another page) */
  embedded?: boolean
}

/**
 * xmeta-admin жишгийн жагсаалт хуудас: BaseTable + хайлт + faceted filter +
 * ConfigFormDialog (create / edit) + ConfirmDialog (delete). Энгийн CRUD хуудсууд үүнийг ашиглана.
 */
export function ResourcePage<
  TRow extends Record<string, unknown>,
  TForm extends Record<string, unknown> = Record<string, unknown>,
>({
  title,
  description,
  queryKey,
  search,
  navigate,
  list,
  columns,
  searchPlaceholder = 'Search...',
  filters = [],
  form,
  remove,
  onRowClick,
  rowKey,
  customActions,
  toolbarExtra,
  beforeTable,
  exportFileName,
  params: extraParams,
  defaultPageSize = 20,
  embedded = false,
}: ResourcePageProps<TRow, TForm>) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<{ row?: TRow } | null>(null)
  const [deleting, setDeleting] = useState<TRow | null>(null)

  const { params } = useFilterParams(search, {
    defaultMonths: 0,
    defaultPageSize,
    searchKey: 'query',
  })
  const requestParams = useMemo(
    () => ({ ...params, ...extraParams }),
    [params, extraParams]
  )

  const { data, isLoading, refetch } = useQuery({
    queryKey: [queryKey, requestParams],
    queryFn: async () => {
      const res = await list(requestParams)
      return { items: res.body?.items ?? [], total: res.body?.total ?? 0 }
    },
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [queryKey] })

  const save = useMutation({
    mutationFn: async (values: TForm) => {
      if (editing?.row && form?.update) return form.update(editing.row, values)
      if (form?.create) return form.create(values)
      throw new Error('Not supported')
    },
    onSuccess: (res) => {
      toast.success(res.message)
      invalidate()
      setEditing(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const destroy = useMutation({
    mutationFn: (row: TRow) => remove!.run(row),
    onSuccess: (res) => {
      toast.success(res.message)
      invalidate()
      setDeleting(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const tableColumns = useMemo<ColumnDef<TRow>[]>(
    () => [
      {
        id: 'query',
        accessorKey: 'query',
        header: () => null,
        cell: () => null,
        enableHiding: false,
        enableSorting: false,
        meta: { className: 'hidden' },
      },
      ...columns,
    ],
    [columns]
  )

  const table = (
    <BaseTable<TRow>
      data={data?.items ?? []}
      total={data?.total}
      columns={tableColumns}
      search={search}
      navigate={navigate}
      isLoading={isLoading}
      rowKey={rowKey}
      enableRowSelection={false}
      onRowClick={onRowClick}
      onUpdate={form?.update ? (row) => setEditing({ row }) : undefined}
      onDelete={remove ? (row) => setDeleting(row) : undefined}
      customActions={customActions}
      hideAction={!form?.update && !remove && !customActions}
      tableConfig={{
        pagination: { defaultPage: 1, defaultPageSize },
        globalFilter: { enabled: false },
        columnFilters: [
          { columnId: 'query', searchKey: 'query', type: 'string' },
          ...filters.map((f) => ({
            columnId: f.columnId,
            searchKey: f.columnId,
            type: 'array' as const,
          })),
        ],
      }}
      header={
        embedded ? undefined : (
          <TableHeader title={title} description={description} />
        )
      }
      renderBeforeTable={beforeTable}
      toolbar={{
        searchPlaceholder,
        searchKey: 'query',
        filters,
        exportFileName,
        extra: (
          <>
            {toolbarExtra}
            {form?.create && (
              <Button
                size='sm'
                className='h-8 gap-2'
                onClick={() => setEditing({})}
              >
                <Plus className='size-4' />
                Create {form.entity}
              </Button>
            )}
          </>
        ),
      }}
      onRefresh={refetch}
    />
  )

  return (
    <>
      {embedded ? (
        table
      ) : (
        <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>{table}</Main>
      )}

      {form && editing && (
        <ConfigFormDialog<TForm>
          open
          onClose={() => setEditing(null)}
          schema={form.schema}
          fields={form.fields}
          data={editing.row ? form.fromRow(editing.row) : undefined}
          defaultValues={editing.row ? form.fromRow(editing.row) : form.empty}
          onSubmit={async (values) => {
            await save.mutateAsync(values)
          }}
          title={`${editing.row ? 'Edit' : 'Create'} ${form.entity}`}
          description={form.description}
          submitButtonText={editing.row ? 'Save' : 'Create'}
          isSubmitting={save.isPending}
          maxWidth={form.maxWidth ?? 'lg'}
        />
      )}

      {remove && deleting && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete ${form?.entity ?? 'record'}`}
          desc={`Delete "${remove.label(deleting)}"? This cannot be undone.`}
          confirmText='Delete'
          destructive
          isLoading={destroy.isPending}
          handleConfirm={() => destroy.mutate(deleting)}
        />
      )}
    </>
  )
}
