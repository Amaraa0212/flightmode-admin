import { useEffect, useMemo, useRef } from 'react'
import type { NavigateFn } from './use-table-url-state'

type UseServerlessPaginationParams = {
  // lastEvaluatedKey from API response (to check if there's next page)
  lastEvaluatedKeyFromResponse?: string | Record<string, unknown> | null
  // lastEvaluatedKey from URL search params (to determine current page)
  lastEvaluatedKeyFromUrl?: string | Record<string, unknown> | null
  // Current page number from URL search params (optional, defaults to 1)
  currentPageFromUrl?: number
  navigate: NavigateFn
  // Unique key for storing history in sessionStorage (e.g., 'news-list' or 'stake-pools')
  storageKey: string
}

type UseServerlessPaginationReturn = {
  hasNextPage: boolean
  currentPage: number
  handleNextPage: () => void
  handlePreviousPage: () => void
}

/**
 * Hook for managing serverless (DynamoDB) pagination with lastEvaluatedKey
 * Used for tables that use cursor-based pagination instead of page-based pagination
 *
 * @param lastEvaluatedKeyFromResponse - The lastEvaluatedKey from API response (used to check if there's next page)
 * @param lastEvaluatedKeyFromUrl - The lastEvaluatedKey from URL search params (used to determine current page)
 * @param currentPageFromUrl - The current page number from URL search params (optional, defaults to 1)
 * @param navigate - Navigation function to update URL search params
 * @param storageKey - Unique key for storing cursor history in sessionStorage
 */
export function useServerlessPagination({
  lastEvaluatedKeyFromResponse,
  lastEvaluatedKeyFromUrl,
  currentPageFromUrl,
  navigate,
  storageKey,
}: UseServerlessPaginationParams): UseServerlessPaginationReturn {
  // Get cursor history from sessionStorage
  const getCursorHistory = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = sessionStorage.getItem(`${storageKey}-cursor-history`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Save cursor history to sessionStorage
  const saveCursorHistory = (history: string[]) => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(
        `${storageKey}-cursor-history`,
        JSON.stringify(history)
      )
    } catch {
      // Ignore storage errors
    }
  }

  // Initialize cursor history on mount
  const historyRef = useRef<string[]>(getCursorHistory())

  // Update history when lastEvaluatedKey changes in URL
  useEffect(() => {
    if (!lastEvaluatedKeyFromUrl) {
      // Reset history when going back to page 1
      historyRef.current = []
      saveCursorHistory([])
      return
    }

    const currentKey =
      typeof lastEvaluatedKeyFromUrl === 'string'
        ? lastEvaluatedKeyFromUrl
        : JSON.stringify(lastEvaluatedKeyFromUrl)

    // Check if this key is already in history (to avoid duplicates)
    const history = getCursorHistory()
    if (!history.includes(currentKey)) {
      // Add current key to history
      historyRef.current = [...history, currentKey]
      saveCursorHistory(historyRef.current)
    }
  }, [lastEvaluatedKeyFromUrl, storageKey])

  // Check if there's a next page based on API response
  const hasNextPage = !!(
    lastEvaluatedKeyFromResponse &&
    (typeof lastEvaluatedKeyFromResponse === 'string'
      ? lastEvaluatedKeyFromResponse.trim() !== ''
      : Object.keys(lastEvaluatedKeyFromResponse).length > 0)
  )

  // Determine current page based on URL search params
  // If page number is provided in URL, use it; otherwise calculate from lastEvaluatedKey
  const currentPage = useMemo(() => {
    if (currentPageFromUrl !== undefined && currentPageFromUrl > 0) {
      return currentPageFromUrl
    }
    // Fallback: if lastEvaluatedKey exists in URL, we're on page 2, otherwise page 1
    return lastEvaluatedKeyFromUrl ? 2 : 1
  }, [currentPageFromUrl, lastEvaluatedKeyFromUrl])

  const handleNextPage = () => {
    if (lastEvaluatedKeyFromResponse) {
      // Parse string to object if needed, then stringify to ensure JSON format
      let parsedKey: Record<string, unknown>
      if (typeof lastEvaluatedKeyFromResponse === 'string') {
        try {
          // Try to parse the string as JSON
          parsedKey = JSON.parse(lastEvaluatedKeyFromResponse)
        } catch {
          // If parsing fails, treat it as a plain string value
          parsedKey = { value: lastEvaluatedKeyFromResponse }
        }
      } else {
        parsedKey = lastEvaluatedKeyFromResponse
      }
      const keyValue = JSON.stringify(parsedKey)

      // Add current lastEvaluatedKey to history before navigating to next page
      if (lastEvaluatedKeyFromUrl) {
        const currentKey =
          typeof lastEvaluatedKeyFromUrl === 'string'
            ? lastEvaluatedKeyFromUrl
            : JSON.stringify(lastEvaluatedKeyFromUrl)
        const history = getCursorHistory()
        if (!history.includes(currentKey)) {
          historyRef.current = [...history, currentKey]
          saveCursorHistory(historyRef.current)
        }
      }

      const nextPage = currentPage + 1
      navigate({
        search: (prev) => ({
          ...(prev as Record<string, unknown>),
          lastEvaluatedKey: keyValue,
          page: nextPage > 1 ? nextPage : undefined,
        }),
      })
    }
  }

  const handlePreviousPage = () => {
    const history = getCursorHistory()

    if (history.length === 0) {
      // No history, go back to page 1
      navigate({
        search: (prev) => {
          const newSearch = { ...(prev as Record<string, unknown>) }
          delete newSearch.lastEvaluatedKey
          delete newSearch.page
          return newSearch
        },
      })
      return
    }

    // Remove current key from history
    const newHistory = [...history]
    newHistory.pop() // Remove the last (current) key
    historyRef.current = newHistory
    saveCursorHistory(newHistory)

    if (newHistory.length === 0) {
      // Go back to page 1
      navigate({
        search: (prev) => {
          const newSearch = { ...(prev as Record<string, unknown>) }
          delete newSearch.lastEvaluatedKey
          delete newSearch.page
          return newSearch
        },
      })
    } else {
      // Go back to previous page using the last key in history
      const previousKey = newHistory[newHistory.length - 1]
      const prevPage = currentPage - 1
      navigate({
        search: (prev) => ({
          ...(prev as Record<string, unknown>),
          lastEvaluatedKey: previousKey,
          page: prevPage > 1 ? prevPage : undefined,
        }),
      })
    }
  }

  return {
    hasNextPage,
    currentPage,
    handleNextPage,
    handlePreviousPage,
  }
}
