import { Link } from '@tanstack/react-router'
import { APP } from '@/config/app'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LogoImage } from './logo-image'

export function AppBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild>
          <Link to='/'>
            <div className='flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg'>
              <LogoImage />
            </div>
            <div className='grid flex-1 text-start text-sm leading-tight'>
              <span className='truncate font-semibold'>{APP.name}</span>
              <span className='truncate text-xs'>{APP.subtitle}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
