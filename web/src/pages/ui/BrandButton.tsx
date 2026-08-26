import type { ComponentProps } from 'react'
import { Button } from '../../lib/shadcn/button'
import { cn } from '../../lib/shadcn/utils'

type BrandButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type BrandButtonProps = Omit<ComponentProps<typeof Button>, 'variant'> & {
  brandVariant?: BrandButtonVariant
}

const variantClasses: Record<BrandButtonVariant, string> = {
  primary: 'ico-button-primary',
  secondary: 'ico-button-secondary',
  ghost: 'ico-button-ghost',
  danger: 'ico-button-danger',
}

export default function BrandButton({
  brandVariant = 'primary',
  className,
  ...props
}: BrandButtonProps) {
  return (
    <Button
      className={cn('ico-button', variantClasses[brandVariant], className)}
      variant="ghost"
      {...props}
    />
  )
}
