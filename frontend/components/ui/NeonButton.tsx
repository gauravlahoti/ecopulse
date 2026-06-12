'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

const neonButton = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-space-black disabled:opacity-40 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        cyan: 'border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-neon-cyan focus-visible:ring-neon-cyan',
        purple: 'border border-neon-purple text-neon-purple hover:bg-neon-purple/10 hover:shadow-neon-purple focus-visible:ring-neon-purple',
        solid: 'bg-gradient-to-r from-neon-cyan to-[#00C896] text-space-black border-none font-bold hover:shadow-neon-cyan-lg focus-visible:ring-neon-cyan',
        ghost: 'text-text-secondary hover:text-text-primary border border-white/10 hover:border-white/20 focus-visible:ring-white/30',
        danger: 'border border-carbon-critical text-carbon-critical hover:bg-carbon-critical/10 focus-visible:ring-carbon-critical',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-8 py-3.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'cyan',
      size: 'md',
    },
  }
)

type NeonButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof neonButton>

export function NeonButton({
  className,
  variant,
  size,
  children,
  ...props
}: NeonButtonProps) {
  const reducedMotion = useReducedMotion()

  if (!reducedMotion) {
    return (
      <motion.button
        className={cn(neonButton({ variant, size }), className)}
        whileHover={{ translateY: variant === 'solid' ? -1 : 0 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        {...(props as unknown as React.ComponentProps<typeof motion.button>)}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <button className={cn(neonButton({ variant, size }), className)} {...props}>
      {children}
    </button>
  )
}
