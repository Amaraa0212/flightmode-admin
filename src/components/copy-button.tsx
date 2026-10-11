import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  value: string | number
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  successMessage?: string
  errorMessage?: string
}

export function CopyButton({
  value,
  className,
  size = 'icon',
  successMessage = 'Copied to clipboard!',
  errorMessage = 'Failed to copy',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      toast.success(successMessage)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error(errorMessage)
      console.error('Copy failed:', err)
    }
  }

  return (
    <Button
      variant='ghost'
      size={size}
      className={cn('h-6 w-6', className)}
      onClick={handleCopy}
      title='Copy to clipboard'
    >
      {copied ? (
        <Check className='h-3 w-3 text-green-500' />
      ) : (
        <Copy className='h-3 w-3' />
      )}
    </Button>
  )
}
