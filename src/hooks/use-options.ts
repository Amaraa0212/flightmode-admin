import { useQuery } from '@tanstack/react-query'

type Option = { label: string; value: string }

/** Select options loaded from the API (cached for a minute) */
export function useOptions(key: string, load: () => Promise<Option[]>): Option[] {
  const { data = [] } = useQuery({ queryKey: ['options', key], queryFn: load, staleTime: 60_000 })
  return data
}
