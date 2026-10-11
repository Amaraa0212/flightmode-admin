import { useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  EyeNoneIcon,
} from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SearchOption = {
  label: string
  value: string
}

type DataTableColumnHeaderProps<TData, TValue> =
  React.HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>
    title: string
    searchable?: boolean
    searchType?: 'text' | 'select'
    searchOptions?: SearchOption[]
    onSearch?: (value: string) => void
  }

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  searchable = false,
  searchType = 'text',
  searchOptions = [],
  onSearch,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const [searchValue, setSearchValue] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchValue)
    }
    setIsSearchOpen(false)
  }

  const handleClear = () => {
    setSearchValue('')
    if (onSearch) {
      onSearch('')
    }
    if (searchType === 'text') {
      setIsSearchOpen(false)
    }
  }

  const handleSelectChange = (value: string) => {
    setSearchValue(value)
    if (onSearch) {
      onSearch(value)
    }
    setIsSearchOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsSearchOpen(open)
  }

  if (!column.getCanSort() && !searchable) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {column.getCanSort() ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='data-[state=open]:bg-accent h-8'
            >
              <span>{title}</span>
              {column.getIsSorted() === 'desc' ? (
                <ArrowDownIcon className='ms-2 h-4 w-4' />
              ) : column.getIsSorted() === 'asc' ? (
                <ArrowUpIcon className='ms-2 h-4 w-4' />
              ) : (
                <CaretSortIcon className='ms-2 h-4 w-4' />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start'>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUpIcon className='text-muted-foreground/70 size-3.5' />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDownIcon className='text-muted-foreground/70 size-3.5' />
              Desc
            </DropdownMenuItem>
            {column.getCanHide() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => column.toggleVisibility(false)}
                >
                  <EyeNoneIcon className='text-muted-foreground/70 size-3.5' />
                  Hide
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className='text-sm font-medium'>{title}</span>
      )}

      {searchable && (
        <Popover open={isSearchOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button variant='ghost' size='icon' className='h-6 w-6'>
              <Search className='h-3.5 w-3.5' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-80' align='start'>
            <div className='flex flex-col gap-3'>
              <label className='text-sm font-semibold'>Search {title}</label>

              {searchType === 'text' ? (
                <div className='flex gap-2'>
                  <Input
                    placeholder={`Enter ${title.toLowerCase()}...`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                    className='h-8'
                  />
                  <Button size='sm' onClick={handleSearch} className='h-8'>
                    Search
                  </Button>
                </div>
              ) : (
                <div className='space-y-2'>
                  <Select
                    value={searchValue}
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger className='border-input h-9 w-full'>
                      <SelectValue
                        placeholder={`Select ${title.toLowerCase()}...`}
                      />
                    </SelectTrigger>
                    <SelectContent className='min-w-[200px]'>
                      {searchOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className='hover:bg-accent focus:bg-accent cursor-pointer'
                        >
                          <div className='flex items-center gap-2'>
                            <span className='font-medium'>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {searchValue && (
                    <div className='bg-muted flex items-center justify-between rounded-md px-3 py-2'>
                      <div className='text-xs'>
                        <span className='font-medium'>
                          {
                            searchOptions.find((o) => o.value === searchValue)
                              ?.label
                          }
                        </span>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={handleClear}
                        className='hover:bg-background h-6 px-2 text-xs'
                      >
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {searchValue && searchType === 'text' && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleClear}
                  className='h-7'
                >
                  Clear
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
