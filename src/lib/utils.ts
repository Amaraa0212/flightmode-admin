import { type ClassValue, clsx } from 'clsx'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

export function maskValue(
  value: string | number,
  _visibleChars: number = 5,
  _maxMaskLength: number = 10
): string {
  return String(value)
}

export function formatMoney(amount: number, currency = 'USD') {
  const value = truncateFloor(amount, 2)
  try {
    return value.toLocaleString('en-US', { style: 'currency', currency })
  } catch {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
}

export function truncateFloor(v: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.floor(v * f) / f
}

export function formatDate(
  date: string | Date | number | undefined | null,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  if (date === undefined || date === null) return '-'
  try {
    if (typeof date === 'number') {
      if (date > 1e12) {
        return dayjs(date).format(format)
      } else {
        return dayjs.unix(date).format(format)
      }
    }
    return dayjs(date).format(format)
  } catch {
    return '-'
  }
}

export function formatMnt(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '-'
  return `${Math.round(amount).toLocaleString('en-US')} ₮`
}
