import { useQuery } from '@tanstack/react-query'
import { agencyPortalService } from '@/services'
import { cn } from '@/lib/utils'

/** SSRs of the quota's airline (cached per quota) */
export function useSsrOptions(quotaId: number | null | undefined) {
  const { data = [] } = useQuery({
    queryKey: ['agency-ssr-options', quotaId],
    queryFn: () => agencyPortalService.ssrOptions(quotaId!),
    enabled: !!quotaId,
    staleTime: 10 * 60_000,
  })
  return data
}

/** Special services of one passenger: the codes the flight's airline offers, as toggles */
export function SsrPicker({
  quotaId,
  value,
  onChange,
}: {
  quotaId: number | null | undefined
  value: string[]
  onChange: (codes: string[]) => void
}) {
  const options = useSsrOptions(quotaId)
  if (!options.length) return null
  const toggle = (code: string) =>
    onChange(
      value.includes(code) ? value.filter((c) => c !== code) : [...value, code]
    )
  return (
    <div className='grid gap-1.5'>
      <span className='text-muted-foreground text-xs font-medium'>
        SSR (тусгай үйлчилгээ)
      </span>
      <div className='flex flex-wrap gap-1.5'>
        {options.map((o) => (
          <button
            key={o.code}
            type='button'
            title={o.name}
            onClick={() => toggle(o.code)}
            className={cn(
              'rounded-md border px-2 py-1 font-mono text-xs font-semibold',
              value.includes(o.code)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {o.code}
            <span className='ms-1 font-sans font-normal opacity-80'>
              {o.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
