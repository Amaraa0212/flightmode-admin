import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agencyAccountPortalService } from '@/services'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import {
  formatMoney,
  TransactionsTable,
} from '@/features/agency/transactions/transactions-table'
import { Panel } from '@/features/fare-settings/shared'

/** Agency portal: balance with each airline and the movements of the selected one */
export function AgencyAccount() {
  const accounts = useQuery({
    queryKey: ['agency-accounts'],
    queryFn: async () => (await agencyAccountPortalService.accounts()).body,
  })
  const list = accounts.data ?? []
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = list.find((a) => a.id === selectedId) ?? list[0]

  const transactions = useQuery({
    queryKey: ['agency-accounts', 'transactions', selected?.id],
    queryFn: async () =>
      (await agencyAccountPortalService.transactions(selected!.id)).body,
    enabled: !!selected,
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Миний данс'
        description='Airline бүртэй тусдаа данс. Тийз бичихэд үнэ нь хасагдаж, цуцлахад буцна. Цэнэглэлтийг airline хийнэ.'
      />

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {list.map((a) => (
          <button
            key={a.id}
            type='button'
            onClick={() => setSelectedId(a.id)}
            aria-pressed={a.id === selected?.id}
            className={cn(
              'fm-panel hover:bg-muted/40 flex items-center gap-4 p-4 text-start',
              a.id === selected?.id && 'ring-primary ring-2'
            )}
          >
            <Wallet className='text-muted-foreground size-6' />
            <div>
              <p className='text-muted-foreground text-xs'>
                {a.airline?.iata_code} · {a.airline?.name}
              </p>
              <p className='font-mono text-2xl font-semibold'>
                {formatMoney(a.balance, a.currency)}
              </p>
            </div>
          </button>
        ))}
        {!accounts.isLoading && !list.length && (
          <div className='fm-panel text-muted-foreground p-6 text-sm sm:col-span-2'>
            Данс нээгдээгүй байна. Airline данс цэнэглэх хүртэл тийз
            үлдэгдэлгүйгээр бичигдэнэ.
          </div>
        )}
      </div>

      {selected && (
        <Panel
          title='Гүйлгээ'
          subtitle={`${selected.airline?.name ?? ''} · сүүлийн 100`}
        >
          <TransactionsTable
            rows={transactions.data ?? []}
            currency={selected.currency}
            isLoading={transactions.isLoading}
          />
        </Panel>
      )}
    </Main>
  )
}
