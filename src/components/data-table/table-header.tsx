export interface TableHeaderProps {
  title?: string
  description?: string
  className?: string
}

export function TableHeader({
  title,
  description,
  className,
}: TableHeaderProps) {
  return (
    <div className={className}>
      {(title || description) && (
        <div className='flex flex-col gap-1'>
          {title && (
            <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
          )}
          {description && (
            <p className='text-muted-foreground text-[13px]'>{description}</p>
          )}
        </div>
      )}
    </div>
  )
}
