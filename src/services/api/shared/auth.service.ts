import type {
  AuthUser,
  LoginParams,
  LoginResponse,
  LoginResult,
  TwoFactorSetup,
} from '../../types/shared/auth.types'
import { client, ok } from './client'

/** POST /auth/login (+ /auth/two-factor-challenge), POST /auth/logout, GET /auth/me, Google Authenticator setup */
export const authService = {
  login: async (body: LoginParams) => {
    // a challenge instead of a token when Google Authenticator is on
    const res = await client.post<LoginResult>('/auth/login', {
      ...body,
      device_name: 'admin',
    })
    return ok(res)
  },

  twoFactorChallenge: async (challenge: string, code: string) =>
    ok(
      await client.post<LoginResponse>('/auth/two-factor-challenge', {
        challenge,
        code,
      })
    ),

  /** secret + otpauth:// URL for the QR code */
  setupTwoFactor: async (password: string) =>
    ok(
      (
        await client.post<{ data: TwoFactorSetup }>('/auth/two-factor/setup', {
          password,
        })
      ).data
    ),

  confirmTwoFactor: async (code: string) =>
    ok(
      (
        await client.post<{ data: AuthUser }>('/auth/two-factor/confirm', {
          code,
        })
      ).data
    ),

  logout: async () => {
    await client.post('/auth/logout').catch(() => null)
    return ok(null)
  },

  me: async () => ok((await client.get<{ data: AuthUser }>('/auth/me')).data),
}
