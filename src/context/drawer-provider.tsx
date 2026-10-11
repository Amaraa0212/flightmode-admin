import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type DrawerContent = {
  title: string
  description?: string
  content: ReactNode
  className?: string
}

type DrawerContextType = {
  open: boolean
  openDrawer: (content: DrawerContent) => void
  closeDrawer: () => void
  content: DrawerContent | null
}

const DrawerContext = createContext<DrawerContextType | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<DrawerContent | null>(null)

  const openDrawer = (drawerContent: DrawerContent) => {
    setContent(drawerContent)
    setOpen(true)
  }

  const closeDrawer = () => {
    setOpen(false)
    // Clear content after animation completes
    setTimeout(() => {
      setContent(null)
    }, 300)
  }

  return (
    <DrawerContext.Provider value={{ open, openDrawer, closeDrawer, content }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          className={cn(
            'w-full overflow-y-auto sm:max-w-3xl',
            content?.className
          )}
        >
          {content && (
            <>
              <SheetHeader>
                <SheetTitle>{content.title}</SheetTitle>
                {content.description && (
                  <SheetDescription>{content.description}</SheetDescription>
                )}
              </SheetHeader>
              <div className='mt-6 h-full px-4'>{content.content}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DrawerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}
