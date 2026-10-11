import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
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

export interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string | ReactNode
  description?: string | ReactNode
  children: ReactNode
  footer?: ReactNode
  submitButton?: {
    text?: string
    formId?: string
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
  }
  cancelButton?: {
    text?: string
    onClick?: () => void
    show?: boolean
  }
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  className?: string
  contentClassName?: string
  showCloseButton?: boolean
  onClose?: () => void
  onInteractOutside?: (e: Event) => void
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  full: 'sm:max-w-[95vw]',
}

export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  submitButton,
  cancelButton,
  maxWidth = 'lg',
  className,
  contentClassName,
  showCloseButton = true,
  onClose,
  onInteractOutside,
}: BaseDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && onClose) {
      onClose()
    }
    onOpenChange(newOpen)
  }

  const defaultFooter = (
    <DialogFooter className='gap-y-2'>
      {cancelButton?.show !== false && (
        <Button
          type='button'
          variant='outline'
          onClick={cancelButton?.onClick || (() => handleOpenChange(false))}
        >
          {cancelButton?.text || 'Cancel'}
        </Button>
      )}
      {submitButton && (
        <Button
          type={submitButton.formId ? 'submit' : 'button'}
          form={submitButton.formId}
          onClick={submitButton.onClick}
          disabled={submitButton.disabled || submitButton.loading}
        >
          {submitButton.loading ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading...
            </>
          ) : (
            submitButton.text || 'Submit'
          )}
        </Button>
      )}
    </DialogFooter>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(maxWidthClasses[maxWidth], contentClassName)}
        showCloseButton={showCloseButton}
        onInteractOutside={onInteractOutside}
      >
        <div className='flex max-h-[85vh] flex-col'>
          {(title || description) && (
            <DialogHeader className='flex-shrink-0 text-start'>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </DialogHeader>
          )}
          <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
            {children}
          </div>
          <div className='flex-shrink-0 pt-4'>
            {footer !== undefined
              ? footer
              : submitButton || cancelButton?.show !== false
                ? defaultFooter
                : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
