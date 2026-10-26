import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { agencyAccountPortalService } from '@/services'
import { Wallet } from 'lucide-react'
import { formatMoney } from '@/features/agency/transactions/transactions-table'

/** The agency's balances, one chip per airline (nothing when the airline has not opened an account) */
export function BalanceStrip() {
  const { data = [] } = useQuery({
    queryKey: ['agency-accounts'],
    queryFn: async () => (await agencyAccountPortalService.accounts()).body,
  })
  if (!data.length) return null

  return (
    <Link
      to='/agency/account'
      className='fm-panel hover:bg-muted/40 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm'
    >
      <Wallet className='text-muted-foreground size-4' />
      {data.map((a) => (
        <span key={a.id}>
          <span className='text-muted-foreground'>{a.airline?.iata_code}</span>{' '}
          <b className='font-mono'>{formatMoney(a.balance, a.currency)}</b>
        </span>
      ))}
    </Link>
  )
}
