import { type ReactNode } from 'react'
import { BaseDialog, type BaseDialogProps } from './base-dialog'

export interface BaseFormDialogProps extends Omit<BaseDialogProps, 'children'> {
  formId: string
  children: ReactNode
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  formClassName?: string
}

export function BaseFormDialog({
  formId,
  children,
  onSubmit,
  formClassName,
  submitButton,
  ...dialogProps
}: BaseFormDialogProps) {
  return (
    <BaseDialog
      {...dialogProps}
      submitButton={{
        ...submitButton,
        formId,
      }}
    >
      <form id={formId} onSubmit={onSubmit} className={formClassName}>
        {children}
      </form>
    </BaseDialog>
  )
}
