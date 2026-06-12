'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

const glassCard = cva(
  'relative rounded-glass glass overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border border-white/[0.07] shadow-glass',
        elevated: 'border border-white/[0.1] shadow-glass-hover',
        'glow-cyan': 'border border-neon-cyan/30 shadow-neon-cyan',
        'glow-purple': 'border border-neon-purple/30 shadow-neon-purple',
        danger: 'border border-carbon-critical/40 shadow-[0_0_20px_rgba(255,45,85,0.3)]',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof glassCard> & {
    hoverable?: boolean
  }

export function GlassCard({
  className,
  variant,
  padding,
  hoverable = false,
  children,
  ...props
}: GlassCardProps) {
  const reducedMotion = useReducedMotion()

  if (hoverable && !reducedMotion) {
    return (
      <motion.div
        className={cn(glassCard({ variant, padding }), className)}
        whileHover={{
          scale: 1.01,
          borderColor: 'rgba(0, 245, 212, 0.2)',
          boxShadow: '0 0 30px rgba(0, 245, 212, 0.08)',
        }}
        transition={{ duration: 0.2 }}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={cn(glassCard({ variant, padding }), className)} {...props}>
      {children}
    </div>
  )
}
