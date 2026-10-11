import { formatDate } from '@/lib/utils'
import { resolveExportRelationValue } from '@/utils/export-relations'
import {
  type ExportDownloadOptions,
  withRequesterInFileName,
} from '@/utils/export-file-name'
import type { Table } from '@tanstack/react-table'

const BOM = '\uFEFF'

/**
 * Checks if a string looks like an ISO date and formats it if so.
 */
function maybeFormatDate(value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return formatDate(value)
  }
  return value
}

function downloadBlob(
  blob: Blob,
  fileName: string,
  options?: ExportDownloadOptions
) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', withRequesterInFileName(fileName, options))
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export table data to CSV format
 */
export function exportTableToCSV<TData extends Record<string, unknown>>(
  table: Table<TData>,
  fileName: string = 'export.csv',
  options?: ExportDownloadOptions
): void {
  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter(
      (col) =>
        col.id !== 'actions' &&
        col.id !== 'select' &&
        col.id !== 'query'
    )

  // Get headers
  const headers = visibleColumns.map((col) => {
    const header = col.columnDef.header
    if (typeof header === 'string') {
      return header
    }
    if (typeof header === 'function') {
      const headerResult = header({
        column: col,
        header: col.columnDef.header,
        table,
      } as any)
      if (typeof headerResult === 'string') {
        return headerResult
      }
    }
    return col.id
  })

  // Get rows
  const rows = table.getRowModel().rows.map((row) => {
    return visibleColumns.map((col) => {
      let cellValue = row.getValue(col.id)
      if (cellValue === null || cellValue === undefined) {
        return ''
      }
      
      cellValue = maybeFormatDate(cellValue)

      // Handle React nodes and objects
      if (typeof cellValue === 'object') {
        // React node - skip
        if ('props' in (cellValue as any)) {
          return ''
        }
        // Plain object/array: try to extract a single primitive value
        const values = Array.isArray(cellValue)
          ? cellValue
          : Object.values(cellValue as Record<string, unknown>)
        const firstPrimitive = values.find(
          (v) => v !== null && v !== undefined && typeof v !== 'object'
        )
        if (firstPrimitive !== undefined) {
          return String(firstPrimitive)
        }
        // Fallback to JSON if nothing suitable found
        return JSON.stringify(cellValue)
      }
      // Convert to string and escape quotes
      const stringValue = String(cellValue)
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (
        stringValue.includes(',') ||
        stringValue.includes('\n') ||
        stringValue.includes('"')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
  })

  // Combine headers and rows
  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

  // Create blob and download
  const blob = new Blob([BOM, csvContent], {
    type: 'text/csv;charset=utf-8;',
  })
  const downloadName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  downloadBlob(blob, downloadName, options)
}

/**
 * Export table data to Excel format (XLSX)
 * Requires xlsx library to be installed: npm install xlsx
 * Falls back to CSV if xlsx is not available
 */
export async function exportTableToExcel<TData extends Record<string, unknown>>(
  table: Table<TData>,
  fileName: string = 'export.xlsx',
  options?: ExportDownloadOptions
): Promise<void> {
  try {
    console.log('Starting Excel export...', {
      fileName,
      rowCount: table.getRowModel().rows.length,
    })
    let XLSX: any
    try {
      const xlsxModule = await import('xlsx')
      XLSX = xlsxModule.default || xlsxModule
      console.log('xlsx library loaded successfully')
    } catch (importError) {
      // xlsx is not installed, fallback to CSV
      console.warn(
        'xlsx library not found. Falling back to CSV export.',
        importError
      )
      return exportTableToCSV(
        table,
        fileName.replace('.xlsx', '.csv'),
        options
      )
    }

    const visibleColumns = table
      .getVisibleLeafColumns()
      .filter(
        (col) =>
          col.id !== 'actions' &&
          col.id !== 'select' &&
          col.id !== 'query'
      )

    // Get headers
    const headers = visibleColumns.map((col) => {
      const header = col.columnDef.header
      if (typeof header === 'string') {
        return header
      }
      if (typeof header === 'function') {
        const headerResult = header({
          column: col,
          header: col.columnDef.header,
          table,
        } as any)
        if (typeof headerResult === 'string') {
          return headerResult
        }
      }
      return col.id
    })

    // Get rows
    const rows = table.getRowModel().rows.map((row) => {
      const rowData: Record<string, unknown> = {}
      visibleColumns.forEach((col, index) => {
        let cellValue = row.getValue(col.id)
        
        cellValue = maybeFormatDate(cellValue)

        // Extract text from React nodes if possible
        if (cellValue === null || cellValue === undefined) {
          rowData[headers[index]] = ''
        } else if (typeof cellValue === 'object') {
          // React node - skip
          if ('props' in (cellValue as any)) {
            rowData[headers[index]] = ''
          } else {
            const values = Array.isArray(cellValue)
              ? cellValue
              : Object.values(cellValue as Record<string, unknown>)
            const firstPrimitive = values.find(
              (v) => v !== null && v !== undefined && typeof v !== 'object'
            )
            rowData[headers[index]] =
              firstPrimitive !== undefined ? firstPrimitive : JSON.stringify(cellValue)
          }
        } else {
          rowData[headers[index]] = cellValue
        }
      })
      return rowData
    })

    console.log('Creating Excel workbook...', {
      headers,
      rowCount: rows.length,
    })
    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // Generate file and download
    console.log('Generating Excel buffer...')
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })
    console.log('Excel buffer generated', { size: excelBuffer.length })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    console.log('Blob created', { size: blob.size, type: blob.type })
    const downloadFileName = fileName.endsWith('.xlsx')
      ? fileName
      : `${fileName}.xlsx`
    console.log('Triggering download...', {
      downloadFileName,
      blobSize: blob.size,
    })

    downloadBlob(blob, downloadFileName, options)
  } catch (error) {
    console.error('Failed to export to Excel. Falling back to CSV.', error)
    // Fallback to CSV if xlsx is not available
    exportTableToCSV(table, fileName.replace('.xlsx', '.csv'), options)
  }
}

export type JsonCsvColumn<T extends Record<string, unknown>> = {
  key: string
  header: string
  accessor?: (row: T) => unknown
}

/** Minimal shape for building export columns (used internally). */
type ColumnDefLike<T> = {
  id?: string
  accessorKey?: string
  accessorFn?: (row: T, index: number) => unknown
  header?: unknown
  meta?: {
    exportPath?: string
  }
}

/**
 * Build export columns from column definitions (no table instance).
 * Skips columns with id in ['query','select','actions'].
 * Accepts TanStack Table ColumnDef[] (header may be (props) => ReactNode).
 */
export function buildColumnsFromColumnDefs<T extends Record<string, unknown>>(
  columnDefs: unknown[]
): JsonCsvColumn<T>[] {
  const defs = columnDefs as ColumnDefLike<T>[]
  return defs
    .filter((col) => {
      const id = col.id ?? col.accessorKey ?? ''
      return !['query', 'select', 'actions'].includes(String(id))
    })
    .map((col) => {
      const headerText =
        typeof col.header === 'string'
          ? col.header
          : (col.id ?? col.accessorKey ?? '')
      const accessorKey = col.meta?.exportPath ?? col.accessorKey
      const accessorFn = col.accessorFn
      return {
        key: col.id ?? accessorKey ?? '',
        header: headerText,
        accessor: (row: T) => {
          let value: unknown
          if (typeof accessorFn === 'function') {
            value = accessorFn(row, 0)
          } else if (accessorKey) {
            const path = accessorKey.split('.')
            let v: unknown = row
            for (const segment of path) {
              if (v == null) break
              v = (v as Record<string, unknown>)[segment]
            }
            value = v
          } else {
            value = (row as Record<string, unknown>)[col.id ?? '']
          }
          return maybeFormatDate(
            resolveExportRelationValue(
              value,
              accessorKey ?? col.id ?? '',
              headerText
            )
          )
        },
      }
    })
}

/**
 * Export data to Excel using column descriptors (headers and accessors).
 */
export async function exportJsonToExcelWithColumns<T extends Record<string, unknown>>(
  data: T[],
  fileName: string,
  columns: JsonCsvColumn<T>[],
  options?: ExportDownloadOptions
): Promise<void> {
  const subIdKeys = ['subaccountid', 'subid']
  const headers = columns.map((c) => c.header)
  const rows = (data ?? []).map((item) => {
    const row: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      const value = col.accessor ? col.accessor(item) : (item as Record<string, unknown>)[col.key]
      const formatted = value === null || value === undefined ? '' : maybeFormatDate(value)
      let final = formatted === null || formatted === undefined
          ? ''
          : typeof formatted === 'object'
            ? JSON.stringify(formatted)
            : formatted
      // subAccountId field-д "a" suffix нэмэх
      if (subIdKeys.includes(col.key.toLowerCase()) && final && final !== '') {
        final = String(final) + 'a'
      }
      row[headers[i]] = final
    })
    return row
  })
  try {
    const xlsxModule = await import('xlsx')
    const XLSX = xlsxModule.default || xlsxModule
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    downloadBlob(
      blob,
      fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
      options
    )
  } catch (error) {
    console.error('Failed to export to Excel.', error)
  }
}

export function buildColumnsFromTable<TData extends Record<string, unknown>>(
  table: Table<TData>
): JsonCsvColumn<TData>[] {
  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter(
      (col) =>
        col.id !== 'actions' &&
        col.id !== 'select' &&
        col.id !== 'query'
    )

  return visibleColumns.map((col) => {
    const headerDef = col.columnDef.header
    let headerText: string

    if (typeof headerDef === 'string') {
      headerText = headerDef
    } else {
      headerText = col.id
    }

    const accessorKey = (col.columnDef as any).accessorKey as
      | string
      | undefined
    const accessorFn = (col.columnDef as any).accessorFn as
      | ((row: any, index: number) => unknown)
      | undefined

    return {
      key: col.id,
      header: headerText,
      accessor: (row: any) => {
        let value: any
        if (typeof accessorFn === 'function') {
          value = accessorFn(row, 0)
        } else if (accessorKey) {
          // Support nested accessor keys like "User.email"
          const path = accessorKey.split('.')
          value = row
          for (const segment of path) {
            if (value == null) break
            value = value[segment]
          }
        } else {
          value = row[col.id as keyof typeof row]
        }
        // Object ирвэл subAccountId эсвэл email авах
        return maybeFormatDate(
          resolveExportRelationValue(
            value,
            accessorKey ?? String(col.id),
            headerText
          )
        )
      },
    }
  })
}

/**
 * Export arbitrary JSON array data to CSV format.
 * If columns are provided, headers/order come from them, otherwise Object.keys(firstItem) is used.
 */
export function exportJsonToCSV<T extends Record<string, unknown>>(
  data: T[],
  fileName: string = 'export.csv',
  columns?: JsonCsvColumn<T>[],
  options?: ExportDownloadOptions
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const cols: JsonCsvColumn<T>[] =
    columns ??
    (Object.keys(data[0]) as (keyof T)[]).map((key) => ({
      key: String(key),
      header: String(key),
    }))

  // subAccountId/subId key-д "a" suffix нэмж Excel-д string болгох
  const subIdKeys = ['subaccountid', 'subid']

  const headers = cols.map((c) => c.header)
  const rows = data.map((item) =>
    cols.map((col) => {
      let value = col.accessor ? col.accessor(item) : (item as any)[col.key]
      if (value === null || value === undefined) {
        return ''
      }

      value = maybeFormatDate(value)

      if (typeof value === 'object') {
        return ''
      }
      let stringValue = String(value)

      // subAccountId field-д "a" suffix нэмэх
      if (subIdKeys.includes(col.key.toLowerCase()) && stringValue && stringValue !== '') {
        stringValue = stringValue + 'a'
      }

      if (
        stringValue.includes(',') ||
        stringValue.includes('\n') ||
        stringValue.includes('"')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
  )

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
  const blob = new Blob([BOM, csvContent], {
    type: 'text/csv;charset=utf-8;',
  })
  const downloadName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  downloadBlob(blob, downloadName, options)
}

/**
 * Export arbitrary JSON array data to Excel format.
 * Uses object keys from the first item as columns.
 */
export async function exportJsonToExcel<T extends Record<string, unknown>>(
  data: T[],
  fileName: string = 'export.xlsx',
  options?: ExportDownloadOptions
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  try {
    let XLSX: any
    try {
      const xlsxModule = await import('xlsx')
      XLSX = xlsxModule.default || xlsxModule
      console.log('xlsx library loaded successfully for JSON export')
    } catch (importError) {
      console.warn(
        'xlsx library not found. Falling back to CSV export for JSON data.',
        importError
      )

      const headers = Object.keys(data[0])
      const rows = data.map((item) =>
        headers.map((key) => {
          let value = item[key]
          if (value === null || value === undefined) {
            return ''
          }
          
          value = maybeFormatDate(value)

          if (typeof value === 'object') {
            const values = Array.isArray(value)
              ? value
              : Object.values(value as Record<string, unknown>)
            const firstPrimitive = values.find(
              (v) => v !== null && v !== undefined && typeof v !== 'object'
            )
            if (firstPrimitive !== undefined) {
              return String(firstPrimitive)
            }
            return JSON.stringify(value)
          }
          const stringValue = String(value)
          if (
            stringValue.includes(',') ||
            stringValue.includes('\n') ||
            stringValue.includes('"')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
      )

      const csvContent = [headers, ...rows]
        .map((row) => row.join(','))
        .join('\n')
      const blob = new Blob([BOM, csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      const downloadName = fileName.replace(/\.xlsx$/i, '.csv')
      downloadBlob(blob, downloadName, options)
      return
    }

    const headers = Object.keys(data[0])
    const rows = data.map((item) => {
      const rowData: Record<string, unknown> = {}
      headers.forEach((key) => {
        let value = item[key]
        if (value === null || value === undefined) {
          rowData[key] = ''
        } else {
          value = maybeFormatDate(value)
          if (typeof value === 'object') {
            const values = Array.isArray(value)
              ? value
              : Object.values(value as Record<string, unknown>)
            const firstPrimitive = values.find(
              (v) => v !== null && v !== undefined && typeof v !== 'object'
            )
            rowData[key] =
              firstPrimitive !== undefined ? firstPrimitive : JSON.stringify(value)
          } else {
            rowData[key] = value
          }
        }
      })
      return rowData
    })

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const downloadFileName = fileName.endsWith('.xlsx')
      ? fileName
      : `${fileName}.xlsx`
    downloadBlob(blob, downloadFileName, options)
  } catch (error) {
    console.error('Failed to export JSON data to Excel.', error)
  }
}

/**
 * Export table data - automatically chooses format based on file extension
 */
export function exportTable<TData extends Record<string, unknown>>(
  table: Table<TData>,
  fileName: string = 'export.csv',
  format: 'csv' | 'excel' = 'csv',
  options?: ExportDownloadOptions
): void | Promise<void> {
  if (format === 'excel' || fileName.endsWith('.xlsx')) {
    return exportTableToExcel(table, fileName, options)
  }
  exportTableToCSV(table, fileName, options)
}
