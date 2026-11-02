import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { refreshProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { DrawerProvider } from '@/context/drawer-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ConfigDrawer } from '@/components/config-drawer'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { PageHelp } from '@/components/page-help/page-help'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { SkipToMain } from '@/components/skip-to-main'
import { ThemeSwitch } from '@/components/theme-switch'
import { TwoFactorSetupPrompt } from '@/components/two-factor'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  // menus / permissions may have changed since sign-in
  useEffect(() => {
    refreshProfile().catch(() => null)
  }, [])

  return (
    <SearchProvider>
      <LayoutProvider>
        <DrawerProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SkipToMain />
            <AppSidebar />
            <SidebarInset
              className={cn(
                '@container/content',

                'has-[[data-layout=fixed]]:h-svh',

                'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]'
              )}
            >
              <Header fixed>
                <Search />
                <div className='ms-auto flex items-center space-x-4'>
                  <ThemeSwitch />
                  <ConfigDrawer />
                  <ProfileDropdown />
                </div>
              </Header>
              {children ?? <Outlet />}
              <PageHelp />
              <TwoFactorSetupPrompt />
            </SidebarInset>
          </SidebarProvider>
        </DrawerProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
