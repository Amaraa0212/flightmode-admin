import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { applyDocumentTitle, brandFor } from '@/config/app'
import { useAuthStore } from '@/stores/auth-store'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LogoImage } from './logo-image'

export function AppBrand() {
  const user = useAuthStore((s) => s.auth.user)
  const brand = brandFor(user)
  useEffect(() => applyDocumentTitle(user), [user])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild>
          <Link to='/'>
            <div className='flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg'>
              <LogoImage />
            </div>
            <div className='grid flex-1 text-start text-sm leading-tight'>
              <span className='truncate font-semibold'>{brand.name}</span>
              <span className='truncate text-xs'>{brand.subtitle}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
