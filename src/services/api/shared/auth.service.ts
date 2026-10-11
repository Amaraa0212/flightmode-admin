import type { AuthUser, LoginParams } from '../../types/shared/auth.types'
import { client, ok } from './client'

/** POST /auth/login, POST /auth/logout, GET /auth/me */
export const authService = {
  login: async (body: LoginParams) => {
    const res = await client.post<{ token: string; user: AuthUser }>('/auth/login', {
      ...body,
      device_name: 'admin',
    })
    return ok(res)
  },

  logout: async () => {
    await client.post('/auth/logout').catch(() => null)
    return ok(null)
  },

  me: async () => ok((await client.get<{ data: AuthUser }>('/auth/me')).data),
}
