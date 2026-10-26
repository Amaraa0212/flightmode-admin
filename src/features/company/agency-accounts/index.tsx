import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agencyAccountService, type AgencyAccountRow } from '@/services'
import { History, Search, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import {
  formatDateTime,
  formatMoney,
  TransactionsTable,
} from '@/features/agency/transactions/transactions-table'
import { EmptyRow, Panel } from '@/features/fare-settings/shared'

const KEY = ['agency-accounts']

/** Back office: prepaid balance of every contracted agency; top up / adjust and see the movements */
export function AgencyAccounts() {
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [topUp, setTopUp] = useState<AgencyAccountRow | null>(null)
  const [history, setHistory] = useState<AgencyAccountRow | null>(null)

  const query = useQuery({
    queryKey: [...KEY, term],
    queryFn: async () =>
      (await agencyAccountService.list(term || undefined)).body,
  })
  const rows = query.data ?? []

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Agency accounts'
        description='Агентлагийн урьдчилсан төлбөрийн данс. Тийз бичихэд үнэ (fare + tax) хасагдаж, цуцлахад буцна. Данс нээгээгүй агентлаг үлдэгдэлгүйгээр зарна.'
      />

      <Panel
        title='Agencies'
        subtitle={`${rows.length} гэрээ`}
        actions={
          <form
            className='flex gap-2'
            onSubmit={(e) => {
              e.preventDefault()
              setTerm(search.trim())
            }}
          >
            <Input
              className='h-8 w-48'
              placeholder='Агентлагийн нэр'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type='submit' size='sm' variant='outline' className='h-8'>
              <Search className='size-4' />
            </Button>
          </form>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Airline</TableHead>
              <TableHead className='text-end'>Үлдэгдэл</TableHead>
              <TableHead>Шинэчилсэн</TableHead>
              <TableHead className='text-end'>Үйлдэл</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.agency_id}-${r.airline.id}`}>
                <TableCell>
                  <p className='font-medium'>{r.agency}</p>
                  {!r.contract_active && (
                    <p className='text-muted-foreground text-xs'>
                      гэрээ идэвхгүй
                    </p>
                  )}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {r.airline.iata_code} · {r.airline.name}
                </TableCell>
                <TableCell className='text-end font-mono font-semibold'>
                  {r.account_id ? (
                    formatMoney(r.balance, r.currency)
                  ) : (
                    <span className='text-muted-foreground text-xs font-normal'>
                      данс нээгээгүй
                    </span>
                  )}
                </TableCell>
                <TableCell className='text-muted-foreground font-mono text-xs'>
                  {formatDateTime(r.updated_at)}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
                    <Button
                      size='sm'
                      className='h-7 gap-1 text-xs'
                      onClick={() => setTopUp(r)}
                    >
                      <Wallet className='size-3.5' />
                      Цэнэглэх
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 gap-1 text-xs'
                      disabled={!r.account_id}
                      onClick={() => setHistory(r)}
                    >
                      <History className='size-3.5' />
                      Гүйлгээ
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <EmptyRow colSpan={5}>
                {query.isLoading ? 'Ачаалж байна…' : 'Гэрээтэй агентлаг алга'}
              </EmptyRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      {topUp && <TopUpDialog row={topUp} onClose={() => setTopUp(null)} />}
      {history && (
        <HistoryDialog row={history} onClose={() => setHistory(null)} />
      )}
    </Main>
  )
}

function TopUpDialog({
  row,
  onClose,
}: {
  row: AgencyAccountRow
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<'topup' | 'adjustment'>('topup')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const value = Number(amount)
  const balance = Number(row.balance ?? 0)

  const save = useMutation({
    mutationFn: () =>
      agencyAccountService.topUp({
        agency_id: row.agency_id,
        airline_id: row.airline.id,
        amount: value,
        type,
        note: note.trim(),
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: KEY })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const invalid =
    !amount ||
    Number.isNaN(value) ||
    value === 0 ||
    (type === 'topup' && value < 0) ||
    balance + value < 0

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${row.agency} — данс цэнэглэх`}
      description={`${row.airline.name} · одоогийн үлдэгдэл ${formatMoney(row.balance ?? 0, row.currency)}${row.account_id ? '' : ' (эхний цэнэглэлтээр данс нээгдэж, цаашид тийз бүрээс хасагдана)'}`}
      maxWidth='md'
      className='p-1'
      submitButton={{
        text: type === 'topup' ? 'Цэнэглэх' : 'Тохируулах',
        onClick: () => save.mutate(),
        loading: save.isPending,
        disabled: invalid,
      }}
    >
      <div className='grid gap-4'>
        <div className='flex gap-1.5'>
          {(['topup', 'adjustment'] as const).map((t) => (
            <Button
              key={t}
              type='button'
              size='sm'
              variant={type === t ? 'default' : 'outline'}
              className='h-7 text-xs'
              onClick={() => setType(t)}
            >
              {t === 'topup' ? 'Цэнэглэлт' : 'Тохируулга (±)'}
            </Button>
          ))}
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='topup-amount'>Дүн ({row.currency})</Label>
          <Input
            id='topup-amount'
            type='number'
            inputMode='decimal'
            min={type === 'topup' ? 0 : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={type === 'topup' ? '1000000' : '-50000'}
          />
          {!!amount && !Number.isNaN(value) && (
            <p
              className={
                balance + value < 0
                  ? 'text-xs text-red-600 dark:text-red-400'
                  : 'text-muted-foreground text-xs'
              }
            >
              Шинэ үлдэгдэл: {formatMoney(balance + value, row.currency)}
              {balance + value < 0 && ' — тэгээс бага болохгүй'}
            </p>
          )}
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='topup-note'>Тайлбар</Label>
          <Input
            id='topup-note'
            maxLength={255}
            placeholder='Банкны шилжүүлэг #…'
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </BaseDialog>
  )
}

function HistoryDialog({
  row,
  onClose,
}: {
  row: AgencyAccountRow
  onClose: () => void
}) {
  const query = useQuery({
    queryKey: [...KEY, 'transactions', row.account_id],
    queryFn: async () =>
      (await agencyAccountService.transactions(row.account_id!)).body,
  })

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${row.agency} — гүйлгээ`}
      description={`${row.airline.name} · үлдэгдэл ${formatMoney(row.balance, row.currency)}`}
      maxWidth='3xl'
      cancelButton={{ text: 'Хаах' }}
    >
      <TransactionsTable
        rows={query.data ?? []}
        currency={row.currency}
        isLoading={query.isLoading}
      />
    </BaseDialog>
  )
}
