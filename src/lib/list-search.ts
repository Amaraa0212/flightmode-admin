import { z } from 'zod'

/** Common TanStack Router search schema for list pages (page / pageSize / query / date range). */
export const listSearchSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  query: z.string().optional(),
  start_day: z.string().optional(),
  end_day: z.string().optional(),
})

/** Adds faceted (multi-select) filter keys: `?status=["a","b"]` */
export function withFilters<const K extends string>(...keys: K[]) {
  return listSearchSchema.extend(
    Object.fromEntries(
      keys.map((k) => [k, z.array(z.string()).optional()])
    ) as {
      [P in K]: z.ZodOptional<z.ZodArray<z.ZodString>>
    }
  )
}
