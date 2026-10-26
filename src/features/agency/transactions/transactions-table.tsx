import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface TransactionRow {
  id: number
  type: 'topup' | 'ticket' | 'refund' | 'adjustment'
  amount: string
  balance_after: string
  note: string | null
  pnr: string | null
  passenger: string | null
  created_by: string | null
  created_at: string | null
}

const TYPE_LABEL: Record<TransactionRow['type'], string> = {
  topup: 'Цэнэглэлт',
  ticket: 'Тийз',
  refund: 'Буцаалт',
  adjustment: 'Тохируулга',
}

export const formatMoney = (
  value: string | number | null | undefined,
  currency = ''
) =>
  value === null || value === undefined
    ? '—'
    : `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`

/** ISO time → "YYYY-MM-DD HH:mm" in the viewer's time zone */
export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('sv-SE', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '-'

/** Movements of a prepaid agency account (shared by the agency portal and the back office) */
export function TransactionsTable({
  rows,
  currency,
  isLoading,
}: {
  rows: TransactionRow[]
  currency: string
  isLoading?: boolean
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Огноо</TableHead>
          <TableHead>Төрөл</TableHead>
          <TableHead>Тайлбар</TableHead>
          <TableHead className='text-end'>Дүн</TableHead>
          <TableHead className='text-end'>Үлдэгдэл</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => {
          const amount = Number(t.amount)
          return (
            <TableRow key={t.id}>
              <TableCell className='font-mono text-xs whitespace-nowrap'>
                {formatDateTime(t.created_at)}
              </TableCell>
              <TableCell className='text-xs'>{TYPE_LABEL[t.type]}</TableCell>
              <TableCell className='text-xs'>
                <p>{t.note ?? (t.pnr ? `PNR ${t.pnr}` : '-')}</p>
                {t.created_by && (
                  <p className='text-muted-foreground'>{t.created_by}</p>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  'text-end font-mono font-semibold whitespace-nowrap',
                  amount < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {amount > 0 ? '+' : ''}
                {formatMoney(amount)}
              </TableCell>
              <TableCell className='text-end font-mono whitespace-nowrap'>
                {formatMoney(t.balance_after, currency)}
              </TableCell>
            </TableRow>
          )
        })}
        {!rows.length && (
          <TableRow>
            <TableCell
              colSpan={5}
              className='text-muted-foreground h-20 text-center'
            >
              {isLoading ? 'Ачаалж байна…' : 'Гүйлгээ алга'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
