/** flightmode-api (Laravel) — back office endpoints live under `${api.base}/admin/...` */
const base = String(import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '')

export const api = { base }
