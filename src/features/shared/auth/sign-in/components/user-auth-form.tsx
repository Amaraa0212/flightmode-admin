import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authService } from '@/services'
import type { AuthUser } from '@/services/types/shared/auth.types'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  KeyRound,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { hasBackOfficeAccess } from '@/components/layout/data/sidebar-data'
import { TwoFactorLoginStep } from '@/components/two-factor'

// a gate-only login has no screen here (it uses the gate app)
function assertBackOfficeAccess(user: AuthUser) {
  if (!hasBackOfficeAccess(user)) {
    throw new Error(
      'Энэ эрхээр admin системд нэвтрэх боломжгүй (gate хэрэглэгч gate app ашиглана).'
    )
  }
}

const formSchema = z.object({
  email: z.email({
    error: (iss) =>
      iss.input === '' ? 'Please enter your email' : 'Invalid email',
  }),
  password: z
    .string()
    .min(1, 'Enter your operations password')
    .min(6, 'Password must be at least 6 characters long'),
})

type FormValues = z.infer<typeof formSchema>

type UserAuthFormProps = Readonly<{
  redirectTo?: string
  className?: string
}>

const fieldClass =
  'bg-card/70 focus-within:border-cyan-400/60 focus-within:ring-cyan-400/20 flex h-14 items-center gap-3 rounded-2xl border px-4 backdrop-blur transition focus-within:ring-4'
const inputClass =
  'placeholder:text-muted-foreground/60 h-full w-full bg-transparent text-base outline-none'

export function UserAuthForm({ className, redirectTo }: UserAuthFormProps) {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  // Google Authenticator on: password accepted, waiting for the 6-digit code
  const [challenge, setChallenge] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await authService.login(data)
      if (!('two_factor_required' in res.body))
        assertBackOfficeAccess(res.body.user)
      return res
    },
    onSuccess: (res) => {
      if ('two_factor_required' in res.body) {
        setChallenge(res.body.challenge)
        return
      }
      auth.setSession(res.body.user, res.body.token)
      signedIn()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Алдаа гарлаа')
    },
  })

  function signedIn() {
    navigate({ to: redirectTo || '/', replace: true })
    toast.success('Амжилттай нэвтэрлээ')
  }

  if (challenge) {
    return (
      <TwoFactorLoginStep
        challenge={challenge}
        check={assertBackOfficeAccess}
        onBack={() => setChallenge(null)}
        onSignedIn={signedIn}
      />
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))}
        className={cn('grid gap-6', className)}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem className='gap-2.5'>
              <div className='flex items-center justify-between'>
                <label htmlFor='email' className='fm-label'>
                  Email
                </label>
              </div>
              <FormControl>
                <div className={fieldClass}>
                  <UserRound className='text-brand size-5 shrink-0' />
                  <input
                    id='email'
                    autoComplete='username'
                    placeholder='name@airline.mn'
                    className={inputClass}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='gap-2.5'>
              <div className='flex items-center justify-between'>
                <label htmlFor='password' className='fm-label'>
                  Password
                </label>
                <button
                  type='button'
                  onClick={() =>
                    toast.info(
                      'Contact your system administrator to reset the password.'
                    )
                  }
                  className='text-brand text-xs font-medium hover:underline'
                >
                  Forgot password?
                </button>
              </div>
              <FormControl>
                <div className={fieldClass}>
                  <LockKeyhole className='text-brand size-5 shrink-0' />
                  <input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='current-password'
                    placeholder='••••••••••'
                    className={cn(
                      inputClass,
                      !showPassword && 'tracking-widest'
                    )}
                    {...field}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword((v) => !v)}
                    className='text-muted-foreground hover:text-foreground'
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className='size-5' />
                    ) : (
                      <Eye className='size-5' />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='mt-2 flex gap-3'>
          <button
            type='submit'
            disabled={loginMutation.isPending}
            className={cn(
              'fm-gradient fm-glow flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl text-base font-bold text-[#04121c]',
              'transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70'
            )}
          >
            {loginMutation.isPending ? (
              <Loader2 className='size-5 animate-spin' />
            ) : (
              <>
                Sign In to Back Office
                <ArrowRight className='size-5' />
              </>
            )}
          </button>
          <button
            type='button'
            onClick={() => toast.info('Single sign-on is not connected yet.')}
            className='bg-card/70 text-brand flex size-14 items-center justify-center rounded-2xl border backdrop-blur transition hover:border-cyan-400/50'
            aria-label='Single sign-on'
          >
            <KeyRound className='size-6' />
          </button>
        </div>
      </form>
    </Form>
  )
}
