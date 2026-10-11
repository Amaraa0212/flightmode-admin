/**
 * Standard Dialog Props Interface
 *
 * Бүх dialog components энэ interface ашиглах ёстой.
 * BaseTable автоматаар энэ props-уудыг дамжуулна.
 */

export interface StandardDialogProps<TData = any> {
  /**
   * Dialog нээлттэй эсэх
   */
  open: boolean

  /**
   * Dialog хаах handler
   */
  onClose: () => void

  /**
   * Success callback (save, delete гэх мэт)
   * Амжилттай үйлдэл дууссаны дараа дуудагдана
   */
  onSuccess?: () => void

  /**
   * Dialog-д дамжуулах data (edit, delete үед)
   */
  data?: TData
}

/**
 * Create Dialog Props (data шаардлагагүй)
 */
export type CreateDialogProps = Omit<StandardDialogProps, 'data'>

/**
 * Update Dialog Props (data заавал байх ёстой)
 */
export type UpdateDialogProps<T> = StandardDialogProps<T> & { data: T }

/**
 * Delete Dialog Props (data заавал байх ёстой)
 */
export type DeleteDialogProps<T> = StandardDialogProps<T> & { data: T }

/**
 * Detail Dialog Props
 */
export type DetailDialogProps<T> = StandardDialogProps<T> & { data: T }
