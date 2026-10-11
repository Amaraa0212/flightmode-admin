import { useCallback } from 'react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import type { FilterValues } from '@/components/filter-panel'

type UseFilterHandlersOptions = {
  navigate: NavigateFn
  filterKeys: readonly string[]
  dateRangeKeys?: readonly string[]
  resetPage?: boolean
}
// xxxx
const NUMERIC_FILTER_KEYS = [
  'amount',
  'totalAmount',
  'usdtValuation',
  'minMntValuation',
  'maxMntValuation',
  'minUsdtValuation',
  'maxUsdtValuation',
  'balance',
  'isFeatured',
  'isEnabled',
] as const

export function useFilterHandlers({
  navigate,
  filterKeys,
  dateRangeKeys = [],
  resetPage = true,
}: UseFilterHandlersOptions) {
  const handleFilterChange = useCallback(
    (filters: FilterValues) => {
      navigate({
        search: (prev) => {
          const newSearch = { ...prev }

          filterKeys.forEach((key) => {
            if (filters[key] !== undefined) {
              const raw = filters[key]
              if (
                raw !== undefined &&
                raw !== '' &&
                NUMERIC_FILTER_KEYS.includes(
                  key as (typeof NUMERIC_FILTER_KEYS)[number]
                )
              ) {
                const numValue = Number(raw)
                newSearch[key] = Number.isNaN(numValue) ? raw : numValue
              } else {
                newSearch[key] = raw || undefined
              }
            } else {
              delete newSearch[key]
            }
          })

          if (resetPage) {
            newSearch.page = 1
            delete newSearch.lastEvaluatedKey
            delete newSearch.cursor
          }

          return newSearch
        },
        replace: false,
      })
    },
    [navigate, filterKeys, resetPage]
  )

  const handleClearFilters = useCallback(() => {
    navigate({
      search: (prev) => {
        const newSearch = { ...prev }

        filterKeys.forEach((key) => {
          delete newSearch[key]
        })

        dateRangeKeys.forEach((key) => {
          delete newSearch[key]
        })

        if (resetPage) {
          newSearch.page = 1
          delete newSearch.lastEvaluatedKey
          delete newSearch.cursor
        }

        return newSearch
      },
      replace: false,
    })
  }, [navigate, filterKeys, dateRangeKeys, resetPage])

  const handleApply = useCallback(
    (
      filters: FilterValues,
      range: { start_day?: string; end_day?: string }
    ) => {
      navigate({
        search: (prev) => {
          const newSearch = { ...prev }

          filterKeys.forEach((key) => {
            if (filters[key] !== undefined) {
              const raw = filters[key]
              if (
                raw !== undefined &&
                raw !== '' &&
                NUMERIC_FILTER_KEYS.includes(
                  key as (typeof NUMERIC_FILTER_KEYS)[number]
                )
              ) {
                const numValue = Number(raw)
                newSearch[key] = Number.isNaN(numValue) ? raw : numValue
              } else {
                newSearch[key] = raw || undefined
              }
            } else {
              delete newSearch[key]
            }
          })

          newSearch.start_day = range.start_day
          newSearch.end_day = range.end_day

          if (resetPage) {
            newSearch.page = 1
            delete newSearch.lastEvaluatedKey
            delete newSearch.cursor
          }

          return newSearch
        },
        replace: false,
      })
    },
    [navigate, filterKeys, resetPage]
  )

  return {
    handleFilterChange,
    handleClearFilters,
    handleApply,
  }
}
