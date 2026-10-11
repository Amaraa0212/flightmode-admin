import { useSearch } from '@tanstack/react-router'
import { LogoImage, Wordmark } from '@/components/layout/logo-image'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

function Footer() {
  return (
    <p className='text-muted-foreground text-center text-xs leading-relaxed'>
      Authorized airline, station &amp; agency staff only.
      <br />
      <span className='font-mono'>App Build 3.0.0 (Admin)</span>
    </p>
  )
}

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout footer={<Footer />}>
      <div className='mb-10 flex flex-col items-center text-center'>
        <div className='relative mb-6 flex size-40 items-center justify-center rounded-full border border-cyan-400/15 bg-cyan-400/[0.03]'>
          <div className='fm-glow size-24 rounded-[28%]'>
            <LogoImage />
          </div>
        </div>
        <Wordmark className='text-5xl' />
        <p className='text-muted-foreground mt-3 text-xs font-medium tracking-[0.2em] uppercase sm:text-sm'>
          Airline back office • Admin
        </p>
      </div>
      <UserAuthForm redirectTo={redirect} />
    </AuthLayout>
  )
}
