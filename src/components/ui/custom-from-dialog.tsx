import { useEffect, useRef, useState } from 'react'
import { type z } from 'zod'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/date-picker'
import { DateTimePicker } from '../datetime-picker'
import { ArrayField } from './array-field'
import { BaseFormDialog } from './base-form-dialog'
import { ComboboxField } from './combobox-field'
import type { FormFieldConfig as BaseFormFieldConfig } from './config-form-dialog'
import { HtmlEditor } from './html-editor'
import { ImageUploadField } from './image-upload-field'
import { MarkdownEditor } from './markdown-editor'

// Pattern to allow decimal numbers: allows negative, integer, and decimal parts
// Examples: 0.1, 0.02, -0.5, 123.456, etc.
// This pattern allows: integers, decimals starting with 0 (0.1), decimals starting with . (.5), and negative versions
const NUMBER_INPUT_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/
const TEMPORARY_NUMBER_VALUES = new Set(['', '-', '.', '-.'])
const toChecked = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1 || value === '1'

export type FormFieldConfig<TFormData = Record<string, unknown>> =
  BaseFormFieldConfig<TFormData>

export type CustomFormDialogProps<TFormData extends Record<string, unknown>> = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  data?: Partial<TFormData>
  schema: z.ZodSchema<TFormData>
  fields: FormFieldConfig<TFormData>[]
  onSubmit: (values: TFormData) => Promise<void> | void
  title: string
  description?: string
  submitButtonText?: string
  isSubmitting?: boolean
  defaultValues?: Partial<TFormData>
  getDefaultValues?: (data?: Partial<TFormData>) => Partial<TFormData>
  onFormReady?: (form: UseFormReturn<TFormData>) => void
}

export function CustomFormDialog<TFormData extends Record<string, unknown>>({
  open,
  onClose,
  onSuccess,
  data,
  schema,
  fields,
  onSubmit,
  title,
  description,
  submitButtonText = 'Save',
  isSubmitting = false,
  defaultValues,
  getDefaultValues,
  onFormReady,
}: CustomFormDialogProps<TFormData>) {
  const form = useForm<TFormData>({
    resolver: zodResolver(schema as any) as any,
    defaultValues: (getDefaultValues
      ? getDefaultValues(data)
      : defaultValues || (data as Partial<TFormData>) || {}) as any,
  })

  useEffect(() => {
    if (open && onFormReady) {
      onFormReady(form)
    }
  }, [open, onFormReady, form])

  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const numberInputValuesRef = useRef<Record<string, string>>({})
  useEffect(() => {
    if (!open) return

    const currentDefaults = getDefaultValues
      ? getDefaultValues(data)
      : defaultValues || {}

    if (Object.keys(currentDefaults).length > 0) {
      Object.entries(currentDefaults).forEach(([key, value]) => {
        const currentValue = form.getValues(key as any)
        if (
          value !== undefined &&
          value !== null &&
          value !== '' &&
          currentValue !== value
        ) {
          if (
            data === undefined ||
            currentValue === undefined ||
            currentValue === null ||
            currentValue === ''
          ) {
            form.setValue(key as any, value as any, { shouldDirty: false })
          } else if (data && currentValue !== value) {
            // For edit mode, update if value is different
            form.setValue(key as any, value as any, { shouldDirty: false })
          }
        }
      })
    }
  }, [defaultValues, getDefaultValues, data, form, open])

  const handleSubmit = async (values: any) => {
    try {
      const imageFields = fields.filter((f) => f.type === 'image-upload')
      const fileUploadFields = fields.filter((f) => f.type === 'file-upload')

      const imageFiles = (form as any)._imageFiles || {}
      const fileUploadFiles = (form as any)._fileUploads || {}

      const hasUploads =
        imageFields.some(
          (field) => imageFiles[field.name] && field.onImageUpload
        ) &&
        fileUploadFields.some(
          (field) => fileUploadFiles[field.name] && field.onFileUpload
        )

      if (hasUploads) {
        setIsUploadingImage(true)
      }

      try {
        // 1) Image uploads
        for (const imageField of imageFields) {
          const file = imageFiles[imageField.name]
          if (file && imageField.onImageUpload) {
            try {
              const url = await imageField.onImageUpload(file)
              values[imageField.name] = url
            } catch (error) {
              setIsUploadingImage(false)
              toast.error(
                error instanceof Error
                  ? error.message
                  : `Failed to upload ${imageField.label}`
              )
              throw error
            }
          }
        }

        // 2) Generic file uploads (e.g. users CSV)
        for (const fileField of fileUploadFields) {
          const file = fileUploadFiles[fileField.name] as File | undefined
          if (file && fileField.onFileUpload) {
            try {
              const url = await fileField.onFileUpload(file)
              values[fileField.name] = url
            } catch (error) {
              setIsUploadingImage(false)
              toast.error(
                error instanceof Error
                  ? error.message
                  : `Failed to upload ${fileField.label}`
              )
              throw error
            }
          }
        }
      } finally {
        setIsUploadingImage(false)
      }

      await onSubmit(values as TFormData)
      numberInputValuesRef.current = {}
      ;(form as any)._imageFiles = {}
      ;(form as any)._fileUploads = {}
      form.reset()
      onSuccess?.()
      onClose()
    } catch (error) {
      setIsUploadingImage(false)
      if (import.meta.env.DEV) {
        console.error('Form submission error:', error)
      }
    }
  }

  const shouldShowField = (field: FormFieldConfig<TFormData>): boolean => {
    if (!field.showWhen) return true

    const fieldName = field.showWhen.field
    const fieldPath = String(fieldName)

    const dependentValue = fieldPath.includes('.')
      ? form.watch(fieldPath as any)
      : form.watch(fieldName as any)

    if (field.showWhen.hasValue !== undefined) {
      return field.showWhen.hasValue ? !!dependentValue : !dependentValue
    }
    if (field.showWhen.notValue !== undefined) {
      return dependentValue !== field.showWhen.notValue
    }
    if (field.showWhen.value !== undefined) {
      return dependentValue === field.showWhen.value
    }
    return !!dependentValue
  }

  const renderField = (field: FormFieldConfig<TFormData>) => {
    if (!shouldShowField(field)) return null

    if (field.type === 'array') {
      return <ArrayField key={String(field.name)} field={field} form={form} />
    }

    if (field.type === 'image-upload') {
      return (
        <ImageUploadField key={String(field.name)} field={field} form={form} />
      )
    }

    if (field.type === 'file-upload') {
      return (
        <FormField
          key={String(field.name)}
          control={form.control}
          name={field.name as any}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && ' *'}
              </FormLabel>
              <FormControl>
                <div className='flex gap-2 space-y-2'>
                  <Input
                    type='file'
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0]

                      if (!file) {
                        formField.onChange('' as any)
                        return
                      }

                      // Validate file type if fileType is provided in config
                      if (field.fileType) {
                        const allowed = Array.isArray(field.fileType)
                          ? field.fileType
                          : [field.fileType]

                        const fileExt =
                          file.name.split('.').pop()?.toLowerCase() || ''
                        const mime = file.type.toLowerCase()

                        const isValid = allowed.some((t) => {
                          const normalized = t.toLowerCase()
                          // If starts with a dot or looks like an extension (e.g. 'csv')
                          if (!normalized.includes('/')) {
                            const ext = normalized.startsWith('.')
                              ? normalized.slice(1)
                              : normalized
                            return fileExt === ext
                          }
                          // Otherwise treat as MIME type
                          return mime === normalized
                        })

                        if (!isValid) {
                          toast.error(
                            `Invalid file type. Allowed: ${allowed.join(', ')}`
                          )
                          e.target.value = ''
                          formField.onChange('' as any)
                          return
                        }
                      }

                      ;(form as any)._fileUploads = {
                        ...((form as any)._fileUploads || {}),
                        [field.name]: file,
                      }
                      // Save filename into form value so schema (string) passes
                      formField.onChange(file.name as any)
                    }}
                  />
                  {/* Хуучин URL байвал татах товч харуулах */}
                  {typeof formField.value === 'string' &&
                    formField.value.startsWith('http') && (
                      <Button
                        asChild
                        variant='outline'
                        size='sm'
                        className='h-9 gap-2'
                      >
                        <a
                          href={formField.value}
                          target='_blank'
                          rel='noopener noreferrer'
                          download
                        >
                          Файл татах
                        </a>
                      </Button>
                    )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    if (field.type === 'combobox') {
      return (
        <ComboboxField key={String(field.name)} field={field} form={form} />
      )
    }

    return (
      <FormField
        key={String(field.name)}
        control={form.control}
        name={field.name as any}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && ' *'}
            </FormLabel>
            <FormControl>
              {field.type === 'checkbox' ? (
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    checked={toChecked(formField.value)}
                    onCheckedChange={(checked) => {
                      formField.onChange(checked === true)
                    }}
                  />
                  {field.placeholder && (
                    <span className='text-muted-foreground text-sm'>
                      {field.placeholder}
                    </span>
                  )}
                </div>
              ) : field.type === 'select' ? (
                <Select
                  value={(formField.value as string) || ''}
                  onValueChange={formField.onChange}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue
                      placeholder={field.placeholder || 'Select...'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'markdown' ? (
                <MarkdownEditor
                  value={(formField.value as string) || ''}
                  onChange={(value: string) => {
                    formField.onChange(value as any)
                  }}
                />
              ) : field.type === 'html' ? (
                <HtmlEditor
                  value={(formField.value as string) || ''}
                  onChange={(value: string) => {
                    formField.onChange(value as any)
                  }}
                  placeholder={field.placeholder}
                  templateVariables={field.templateVariables}
                  enableColor={field.htmlEditorOptions?.enableColor}
                  textAlignments={field.htmlEditorOptions?.textAlignments}
                />
              ) : field.type === 'textarea' ? (
                <Textarea
                  placeholder={field.placeholder}
                  rows={field.rows || 3}
                  disabled={field.disabled}
                  {...formField}
                  value={(formField.value as string) || ''}
                />
              ) : field.type === 'date' ? (
                <div className='w-full'>
                  <DatePicker
                    selected={
                      formField.value
                        ? new Date(formField.value as number)
                        : undefined
                    }
                    onSelect={(date) => {
                      formField.onChange(
                        (date ? date.getTime() : undefined) as any
                      )
                    }}
                    placeholder={field.placeholder || 'Pick a date'}
                  />
                </div>
              ) : field.type === 'datetime' ? (
                <div className='w-full'>
                  <DateTimePicker
                    selected={
                      formField.value
                        ? new Date(formField.value as number)
                        : undefined
                    }
                    onSelect={(date) => {
                      formField.onChange(
                        (date ? date.getTime() : undefined) as any
                      )
                    }}
                    placeholder={field.placeholder || 'Pick a date and time'}
                    disabled={field.disabled}
                  />
                </div>
              ) : field.type === 'number' ? (
                <Input
                  type='text'
                  inputMode={
                    field.step && parseFloat(field.step) < 1
                      ? 'decimal'
                      : 'numeric'
                  }
                  placeholder={field.placeholder}
                  step={field.step}
                  min={field.min ? parseFloat(field.min) : undefined}
                  className='[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                  disabled={field.disabled}
                  value={
                    numberInputValuesRef.current[String(field.name)] ??
                    (formField.value !== undefined && formField.value !== null
                      ? String(formField.value)
                      : '')
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    const fieldName = String(field.name)

                    // Allow empty or temporary values
                    if (value === '' || TEMPORARY_NUMBER_VALUES.has(value)) {
                      numberInputValuesRef.current[fieldName] = value
                      formField.onChange(undefined as any)
                      return
                    }

                    // Check if value matches number pattern (including intermediate states like "0.", "0.1", etc.)
                    if (!NUMBER_INPUT_PATTERN.test(value)) {
                      return
                    }

                    numberInputValuesRef.current[fieldName] = value

                    // Allow intermediate states like "0.", "-0." for user to continue typing
                    if (value.endsWith('.') && !value.endsWith('..')) {
                      formField.onChange(undefined as any)
                      return
                    }

                    const parsedValue = Number(value)
                    if (!Number.isNaN(parsedValue)) {
                      formField.onChange(parsedValue as any)
                    }
                  }}
                  onBlur={() => {
                    const fieldName = String(field.name)
                    const currentValue = numberInputValuesRef.current[fieldName]
                    if (currentValue === undefined) return

                    // Handle temporary values like "0." or "-0." by converting to 0
                    if (currentValue === '0.' || currentValue === '-0.') {
                      formField.onChange(0 as any)
                      numberInputValuesRef.current[fieldName] = '0'
                      return
                    }

                    if (TEMPORARY_NUMBER_VALUES.has(currentValue)) {
                      numberInputValuesRef.current[fieldName] =
                        formField.value !== undefined &&
                        formField.value !== null
                          ? String(formField.value)
                          : ''
                      return
                    }

                    const parsedValue = Number(currentValue)
                    if (!Number.isNaN(parsedValue)) {
                      formField.onChange(parsedValue as any)
                      numberInputValuesRef.current[fieldName] =
                        String(parsedValue)
                    }
                  }}
                />
              ) : (
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  step={field.step}
                  min={field.min ? parseFloat(field.min) : undefined}
                  disabled={field.disabled}
                  {...formField}
                  value={String(formField.value ?? '')}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  // Group fields by grid columns
  const groupedFields = fields.reduce(
    (acc, field) => {
      const cols = field.gridCols || 1
      if (!acc[cols]) acc[cols] = []
      acc[cols].push(field)
      return acc
    },
    {} as Record<number, FormFieldConfig<TFormData>[]>
  )

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          setIsUploadingImage(false)
          numberInputValuesRef.current = {}
          ;(form as any)._imageFiles = {}
          form.reset()
          onClose()
        }
      }}
      onInteractOutside={(e) => {
        e.preventDefault()
      }}
      className='mt-4'
      formId='config-form-dialog'
      onSubmit={form.handleSubmit(handleSubmit)}
      maxWidth='2xl'
      title={title}
      description={description}
      formClassName='space-y-4'
      submitButton={{
        text: submitButtonText,
        loading: isSubmitting || isUploadingImage,
        disabled: isSubmitting || isUploadingImage,
      }}
      cancelButton={{
        text: 'Cancel',
        show: !isSubmitting && !isUploadingImage,
      }}
    >
      <Form {...form}>
        <div className='space-y-4'>
          {Object.entries(groupedFields).map(([cols, fields]) => {
            const gridClass =
              {
                '1': 'grid-cols-1',
                '2': 'grid-cols-2',
                '3': 'grid-cols-3',
                '4': 'grid-cols-4',
              }[cols] || 'grid-cols-1'
            return (
              <div key={cols} className={`grid ${gridClass} gap-4`}>
                {fields.map((field) => renderField(field))}
              </div>
            )
          })}
        </div>
      </Form>
    </BaseFormDialog>
  )
}
