import { useEffect, useRef, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { FormFieldConfig } from './config-form-dialog'

export function ImageUploadField<TFormData extends Record<string, unknown>>({
  field,
  form,
}: {
  field: FormFieldConfig<TFormData>
  form: UseFormReturn<TFormData>
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentValue = form.watch(field.name as any) as string | undefined

  // Clear preview when dialog closes or field value is cleared
  useEffect(() => {
    if (!currentValue) {
      setPreview(null)
      setSelectedFile(null)
      setFileError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [currentValue])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)

    if (!file.type.startsWith('image/')) {
      setFileError('Please select an image file')
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image size must be less than 5MB')
      toast.error('Image size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    form.setValue(field.name as any, 'pending-upload' as any, {
      shouldValidate: true,
      shouldDirty: true,
    })

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    form.setValue(field.name as any, '' as any)
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Store selected file in form state for later upload
  useEffect(() => {
    if (selectedFile) {
      // Store file object in a hidden field or use form state
      // We'll use a custom property to store the file
      ; (form as any)._imageFiles = {
        ...((form as any)._imageFiles || {}),
        [field.name]: selectedFile,
      }
    }
  }, [selectedFile, field.name, form])

  // Reset preview when currentValue changes (for edit mode)
  useEffect(() => {
    if (currentValue && !selectedFile) {
      setPreview(null)
    }
  }, [currentValue, selectedFile])

  const imageUrl = preview || currentValue

  return (
    <FormField
      control={form.control}
      name={field.name as any}
      render={() => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && ' *'}
          </FormLabel>
          <FormControl>
            <div className='space-y-2'>
              {imageUrl && (
                <div className='relative inline-block'>
                  <img
                    src={imageUrl}
                    alt='Preview'
                    className='h-32 w-32 rounded-md border object-cover'
                  />
                  <Button
                    type='button'
                    variant='destructive'
                    size='icon'
                    className='absolute -top-2 -right-2 h-6 w-6 rounded-full'
                    onClick={handleRemove}
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>
              )}
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => fileInputRef.current?.click()}
                  className='gap-2'
                >
                  <Upload className='h-4 w-4' />
                  {selectedFile ? 'Change Image' : 'Select Image'}
                </Button>
                <Input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleFileSelect}
                  className='hidden'
                />
              </div>
              {fileError && (
                <p className='text-destructive text-sm font-medium'>
                  {fileError}
                </p>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
