import { useEffect, useState } from 'react'

/**
 * Debounce hook - Утга өөрчлөгдснөөс хойш хэсэг хугацаа хүлээнэ
 *
 * @param value - Debounce хийх утга
 * @param delay - Хүлээх хугацаа (ms), default 500ms
 *
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 500)
 *
 * useEffect(() => {
 *   // API request энд явуулна
 *   fetchData(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Timer үүсгэх
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup function - дахин өөрчлөгдөхөд өмнөх timer-г цэвэрлэх
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
