import { useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { applyDocumentTitle, isAgencyHost } from '@/config/app'
import { Wordmark } from '@/components/layout/logo-image'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

function Footer({ agency }: { agency: boolean }) {
  return (
    <p className='text-muted-foreground text-center text-xs leading-relaxed'>
      {agency ? 'Authorized travel agency staff only.' : 'Authorized airline, station & agency staff only.'}
      <br />
      <span className='font-mono'>App Build 3.0.0 ({agency ? 'Agency Portal' : 'Admin'})</span>
    </p>
  )
}

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const agency = isAgencyHost()
  useEffect(() => applyDocumentTitle(), [])

  return (
    <AuthLayout footer={<Footer agency={agency} />}>
      <div className='mb-10 flex flex-col items-center text-center'>
        <Wordmark className='text-5xl' />
        <p className='text-muted-foreground mt-3 text-xs font-medium tracking-[0.2em] uppercase sm:text-sm'>
          {agency ? 'Travel agency • Agency Portal' : 'Airline back office • Admin'}
        </p>
      </div>
      <UserAuthForm redirectTo={redirect} />
    </AuthLayout>
  )
}
