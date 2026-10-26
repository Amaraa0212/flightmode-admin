import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import type { AuthUser } from '@/services/types/shared/auth.types'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** 6-digit Google Authenticator code */
function CodeInput({
  value,
  onChange,
  onComplete,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  className?: string
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, '').slice(0, 6)
        onChange(next)
        if (next.length === 6) onComplete?.(next)
      }}
      inputMode='numeric'
      autoComplete='one-time-code'
      placeholder='000000'
      aria-label='6 оронтой код'
      className={cn(
        'bg-card/70 h-14 w-full rounded-2xl border px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/20',
        className
      )}
    />
  )
}

/** Sign-in, step 2: the code from Google Authenticator */
export function TwoFactorLoginStep({
  challenge,
  onBack,
  onSignedIn,
  check,
}: {
  challenge: string
  onBack: () => void
  onSignedIn: (user: AuthUser) => void
  /** throws when this user may not use the app */
  check?: (user: AuthUser) => void
}) {
  const setSession = useAuthStore((s) => s.auth.setSession)
  const [code, setCode] = useState('')
  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await authService.twoFactorChallenge(challenge, value)
      check?.(res.body.user)
      return res
    },
    onSuccess: (res) => {
      setSession(res.body.user, res.body.token)
      onSignedIn(res.body.user)
    },
    onError: (err: Error & { code?: string }) => {
      toast.error(err.message || 'Алдаа гарлаа')
      setCode('')
      if (err.code === 'challenge_expired') onBack()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (code.length === 6) mutation.mutate(code)
      }}
      className='grid gap-6'
    >
      <div className='flex items-start gap-3'>
        <ShieldCheck className='text-brand mt-0.5 size-6 shrink-0' />
        <div>
          <p className='font-semibold'>Google Authenticator код</p>
          <p className='text-muted-foreground text-sm'>
            Апп дээрх 6 оронтой кодыг оруулна уу.
          </p>
        </div>
      </div>
      <CodeInput
        value={code}
        onChange={setCode}
        onComplete={(value) => !mutation.isPending && mutation.mutate(value)}
      />
      <div className='flex gap-3'>
        <button
          type='button'
          onClick={onBack}
          className='bg-card/70 text-muted-foreground hover:text-foreground flex size-14 items-center justify-center rounded-2xl border backdrop-blur transition'
          aria-label='Буцах'
        >
          <ArrowLeft className='size-5' />
        </button>
        <button
          type='submit'
          disabled={code.length !== 6 || mutation.isPending}
          className='fm-gradient fm-glow flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl text-base font-bold text-[#04121c] transition hover:brightness-110 disabled:opacity-70'
        >
          {mutation.isPending ? (
            <Loader2 className='size-5 animate-spin' />
          ) : (
            'Баталгаажуулах'
          )}
        </button>
      </div>
    </form>
  )
}

// "Later" lasts until the next sign-in (a new token)
const DISMISSED = 'two_factor_prompt_dismissed'
const tokenTail = (token: string | null) => (token ?? '').slice(-16)

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED)
  } catch {
    return null
  }
}

/** After a login without Google Authenticator: offers to turn it on (scan QR → confirm a code) */
export function TwoFactorSetupPrompt() {
  const user = useAuthStore((s) => s.auth.user)
  const token = useAuthStore((s) => s.auth.token)
  const setUser = useAuthStore((s) => s.auth.setUser)
  const [dismissed, setDismissed] = useState(
    () => readDismissed() === tokenTail(token)
  )
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  const setup = useMutation({
    mutationFn: (value: string) => authService.setupTwoFactor(value),
    onSuccess: () => setPassword(''),
    onError: (err: Error) => toast.error(err.message || 'Алдаа гарлаа'),
  })
  const confirm = useMutation({
    mutationFn: (value: string) => authService.confirmTwoFactor(value),
    onSuccess: (res) => {
      setUser(res.body)
      toast.success('Google Authenticator идэвхжлээ')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Алдаа гарлаа')
      setCode('')
    },
  })

  const later = () => {
    try {
      localStorage.setItem(DISMISSED, tokenTail(token))
    } catch {
      // Ignore storage errors.
    }
    setDismissed(true)
  }

  const secret = setup.data?.body
  const open = !!user && !user.two_factor_enabled && !dismissed
  return (
    <Dialog open={open} onOpenChange={(next) => !next && later()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Google Authenticator идэвхжүүлэх</DialogTitle>
          <DialogDescription>
            {secret
              ? 'Google Authenticator апп-аараа QR кодыг уншуулаад, гарч ирсэн 6 оронтой кодыг оруулна уу.'
              : 'Нэвтрэх бүрт нууц үгийн дараа Google Authenticator апп дээрх 6 оронтой код асууна. Таны бүртгэл илүү хамгаалагдана.'}
          </DialogDescription>
        </DialogHeader>

        {!secret && (
          // the password again: a session left open cannot add someone else's phone
          <form
            id='two-factor-setup'
            className='grid gap-2'
            onSubmit={(e) => {
              e.preventDefault()
              if (password) setup.mutate(password)
            }}
          >
            <label
              htmlFor='two-factor-password'
              className='text-sm font-medium'
            >
              Нууц үгээ оруулна уу
            </label>
            <Input
              id='two-factor-password'
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </form>
        )}

        {secret && (
          <form
            className='grid gap-4'
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === 6) confirm.mutate(code)
            }}
          >
            <div className='mx-auto rounded-xl bg-white p-3'>
              <QRCodeSVG value={secret.otpauth_url} size={176} />
            </div>
            <p className='text-muted-foreground text-center text-xs'>
              Уншуулж чадахгүй бол гараар оруулах түлхүүр:
              <br />
              <span className='text-foreground font-mono text-sm break-all select-all'>
                {secret.secret}
              </span>
            </p>
            <CodeInput
              value={code}
              onChange={setCode}
              onComplete={(value) =>
                !confirm.isPending && confirm.mutate(value)
              }
            />
            <Button
              type='submit'
              disabled={code.length !== 6 || confirm.isPending}
            >
              {confirm.isPending && <Loader2 className='size-4 animate-spin' />}
              Баталгаажуулах
            </Button>
          </form>
        )}

        <DialogFooter>
          <Button variant='ghost' onClick={later} disabled={confirm.isPending}>
            Дараа
          </Button>
          {!secret && (
            <Button
              type='submit'
              form='two-factor-setup'
              disabled={!password || setup.isPending}
            >
              {setup.isPending && <Loader2 className='size-4 animate-spin' />}
              Идэвхжүүлэх
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
