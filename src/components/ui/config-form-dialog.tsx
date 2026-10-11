import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type z } from 'zod'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { HtmlEditor, type HtmlEditorOptions } from './html-editor'
import { ImageUploadField } from './image-upload-field'
import { MarkdownEditor } from './markdown-editor'

// Pattern to allow decimal numbers: allows negative, integer, and decimal parts
// Examples: 0.1, 0.02, -0.5, 123.456, etc.
// This pattern allows: integers, decimals starting with 0 (0.1), decimals starting with . (.5), and negative versions
const NUMBER_INPUT_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/
/** Intermediate keystrokes while typing a decimal (must re-render — use state, not only ref) */
const TEMPORARY_NUMBER_VALUES = new Set(['', '-', '.', '-.', '0.', '-0.'])

export type FormFieldConfig<TFormData = Record<string, unknown>> = {
  name: keyof TFormData
  label: string
  type:
    | 'text'
    | 'number'
    | 'url'
    | 'textarea'
    | 'file-upload'
    | 'email'
    | 'password'
    | 'date'
    | 'datetime'
    | 'image-upload'
    | 'combobox'
    | 'select'
    | 'checkbox'
    | 'markdown'
    | 'html'
    | 'array'
  placeholder?: string
  required?: boolean
  step?: string
  min?: string
  rows?: number
  gridCols?: number
  disabled?: boolean
  // For 'file-upload' type: allowed MIME or extensions (e.g. 'csv' or ['csv', 'xlsx'])
  fileType?: string | string[]
  // For 'file-upload' type: upload handler returning URL to store
  onFileUpload?: (file: File) => Promise<string>
  onImageUpload?: (file: File) => Promise<string>
  options?: Array<{ label: string; value: string }>
  /** select options from the API (loaded when the dialog opens, cached by react-query) */
  loadOptions?: () => Promise<Array<{ label: string; value: string }>>
  showWhen?: {
    field: keyof TFormData
    hasValue?: boolean
    value?: unknown
    notValue?: unknown
  }
  showArrayItemLabel?: boolean
  showArrayItemMax?: number
  comboboxOptions?: {
    fetchOptions: (
      search?: string
    ) => Promise<
      Array<{ value: string; label: string; image?: string; key?: string }>
    >
    placeholder?: string
    onSelect?: (
      value: string,
      image: string | undefined,
      form: UseFormReturn<any>
    ) => void
  }
  arrayItemFields?: FormFieldConfig<any>[]
  addButtonLabel?: string
  templateVariables?: Array<{ label: string; value: string }>
  htmlEditorOptions?: HtmlEditorOptions
  /** Array of selects: exclude option values already selected in other rows (no duplicates) */
  uniqueOptionValuesInArray?: boolean
  /** Optional element rendered on the right side of the field's label row (e.g. a macro selector). */
  headerTrailing?: (form: UseFormReturn<any>) => ReactNode
}

export type ConfigFormDialogProps<TFormData extends Record<string, unknown>> = {
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
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
}

export function ConfigFormDialog<TFormData extends Record<string, unknown>>({
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
  maxWidth = '2xl',
}: ConfigFormDialogProps<TFormData>) {
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
  /** Draft strings for number fields so "0." / "9." stay visible while typing */
  const [numberInputValues, setNumberInputValues] = useState<
    Record<string, string>
  >({})
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
            currentValue === null
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
        ) ||
        fileUploadFields.some(
          (field) => fileUploadFiles[field.name] && field.onFileUpload
        )

      if (hasUploads) {
        setIsUploadingImage(true)
      }

      try {
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
      setNumberInputValues({})
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
      if (Array.isArray(field.showWhen.value)) {
        return field.showWhen.value.includes(dependentValue)
      }
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
              <FormLabel className='flex items-center justify-between gap-2'>
                <span>
                  {field.label}
                  {field.required && ' *'}
                </span>
                {field.headerTrailing ? field.headerTrailing(form) : null}
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

                      if (field.fileType) {
                        const allowed = Array.isArray(field.fileType)
                          ? field.fileType
                          : [field.fileType]

                        const fileExt =
                          file.name.split('.').pop()?.toLowerCase() || ''
                        const mime = file.type.toLowerCase()

                        const isValid = allowed.some((t) => {
                          const normalized = t.toLowerCase()
                          if (!normalized.includes('/')) {
                            const ext = normalized.startsWith('.')
                              ? normalized.slice(1)
                              : normalized
                            return fileExt === ext
                          }

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
                      formField.onChange(file.name as any)
                    }}
                  />
                  {typeof formField.value === 'string' &&
                    formField.value.startsWith('http') && (
                      <a
                        href={formField.value}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center rounded-md border px-3 text-sm'
                      >
                        Open file
                      </a>
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
            <FormLabel className='flex items-center justify-between gap-2'>
              <span>
                {field.label}
                {field.required && ' *'}
              </span>
              {field.headerTrailing ? field.headerTrailing(form) : null}
            </FormLabel>
            <FormControl>
              {field.type === 'checkbox' ? (
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    checked={formField.value as boolean}
                    onCheckedChange={(checked) => {
                      formField.onChange(checked as any)
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
                  // '__none' stands for an empty choice (Radix items cannot have value '')
                  onValueChange={(v) => formField.onChange(v === '__none' ? '' : v)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue
                      placeholder={field.placeholder || 'Select...'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {field.loadOptions ? (
                      <LoadedSelectItems field={field} />
                    ) : (
                      field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
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
                    numberInputValues[String(field.name)] ??
                    (formField.value !== undefined && formField.value !== null
                      ? String(formField.value)
                      : '')
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    const fieldName = String(field.name)

                    // Allow empty or temporary values (incl. "0.") — state forces re-render
                    if (value === '' || TEMPORARY_NUMBER_VALUES.has(value)) {
                      setNumberInputValues((prev) => ({
                        ...prev,
                        [fieldName]: value,
                      }))
                      formField.onChange(
                        value === '' || value === '-' || value === '.' || value === '-.'
                          ? ('' as any)
                          : (undefined as any)
                      )
                      return
                    }

                    // Check if value matches number pattern (including intermediate states like "0.", "0.1", etc.)
                    if (!NUMBER_INPUT_PATTERN.test(value)) {
                      return
                    }

                    setNumberInputValues((prev) => ({
                      ...prev,
                      [fieldName]: value,
                    }))

                    // Allow intermediate states like "0.", "-0.", "9." for user to continue typing
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
                    const currentValue = numberInputValues[fieldName]
                    if (currentValue === undefined) return

                    // Handle temporary values like "0." or "-0." by converting to 0
                    if (currentValue === '0.' || currentValue === '-0.') {
                      formField.onChange(0 as any)
                      setNumberInputValues((prev) => ({
                        ...prev,
                        [fieldName]: '0',
                      }))
                      return
                    }

                    if (TEMPORARY_NUMBER_VALUES.has(currentValue)) {
                      if (currentValue === '') {
                        formField.onChange('' as any)
                        setNumberInputValues((prev) => ({
                          ...prev,
                          [fieldName]: '',
                        }))
                        return
                      }

                      setNumberInputValues((prev) => ({
                        ...prev,
                        [fieldName]:
                          formField.value !== undefined &&
                          formField.value !== null &&
                          formField.value !== ''
                            ? String(formField.value)
                            : '',
                      }))
                      return
                    }

                    const parsedValue = Number(currentValue)
                    if (!Number.isNaN(parsedValue)) {
                      formField.onChange(parsedValue as any)
                      setNumberInputValues((prev) => ({
                        ...prev,
                        [fieldName]: String(parsedValue),
                      }))
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

  // Group consecutive fields by grid columns to preserve original order
  const groupedFields: {
    cols: number
    fields: FormFieldConfig<TFormData>[]
  }[] = []
  fields.forEach((field) => {
    const cols = field.gridCols || 1
    if (
      groupedFields.length > 0 &&
      groupedFields[groupedFields.length - 1].cols === cols
    ) {
      groupedFields[groupedFields.length - 1].fields.push(field)
    } else {
      groupedFields.push({ cols, fields: [field] })
    }
  })

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          setIsUploadingImage(false)
          setNumberInputValues({})
          ;(form as any)._imageFiles = {}
          ;(form as any)._fileUploads = {}
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
      maxWidth={maxWidth}
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
          {groupedFields.map((group, index) => {
            const gridClass =
              {
                1: 'grid-cols-1',
                2: 'grid-cols-2',
                3: 'grid-cols-3',
                4: 'grid-cols-4',
              }[group.cols] || 'grid-cols-1'
            return (
              <div key={index} className={`grid ${gridClass} gap-4`}>
                {group.fields.map((field) => renderField(field))}
              </div>
            )
          })}
        </div>
      </Form>
    </BaseFormDialog>
  )
}

/** Options of a select that come from the API — the static `options` are shown first (e.g. "None") */
function LoadedSelectItems({ field }: { field: FormFieldConfig<any> }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['form-options', String(field.name), field.label],
    queryFn: field.loadOptions!,
    staleTime: 60_000,
  })
  const items = [...(field.options ?? []), ...data]
  if (isLoading && !items.length) {
    return <div className='text-muted-foreground px-2 py-1.5 text-sm'>Loading…</div>
  }
  return (
    <>
      {items.map((option) => (
        <SelectItem key={option.value || '__none'} value={option.value || '__none'}>
          {option.label}
        </SelectItem>
      ))}
    </>
  )
}
