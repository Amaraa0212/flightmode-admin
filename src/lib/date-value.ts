import { format, isValid, parseISO } from 'date-fns'

/**
 * Form value of a `date` field: a local `yyyy-MM-dd` string, the format the API and the zod schemas expect
 * (a timestamp used to slip through here and fail validation, e.g. the quota names deadline).
 */
export const toDateValue = (date: Date | undefined) =>
  date ? format(date, 'yyyy-MM-dd') : ''

/** Reads a stored date field value (`yyyy-MM-dd`, ISO string or legacy timestamp) for the picker. */
export function fromDateValue(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const date =
    typeof value === 'number' ? new Date(value) : parseISO(String(value))
  return isValid(date) ? date : undefined
}
